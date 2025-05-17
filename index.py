from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd
from rapidfuzz import process, fuzz
import os
import io
import csv
import json
import openpyxl
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Global variables
keywords_data = None
available_sheets = []
current_sheet = None
data_file_path = None
file_extension = None
saved_lists = {}  # Dictionary to store saved keyword lists

def detect_file_sheets(file_path):
    """Detect available sheets in the Excel file"""
    global available_sheets, file_extension
    
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension in ['.xlsx', '.xls', '.xlsm']:
        try:
            xls = pd.ExcelFile(file_path)
            available_sheets = xls.sheet_names
            return available_sheets
        except Exception:
            available_sheets = []
            return []
    elif file_extension == '.csv':
        # CSV files don't have sheets, so use filename as the only "sheet"
        sheet_name = os.path.basename(file_path).split('.')[0]
        available_sheets = [sheet_name]
        return [sheet_name]
    return []

def load_saved_lists():
    """Load saved keyword lists from JSON file"""
    global saved_lists
    
    lists_file = os.path.join(os.path.dirname(__file__), 'data', 'saved_lists.json')
    
    if os.path.exists(lists_file):
        try:
            with open(lists_file, 'r') as f:
                saved_lists = json.load(f)
                
                # Remove duplicate keywords in each list
                for list_name in saved_lists:
                    if saved_lists[list_name]:
                        # Remove duplicates while preserving order
                        saved_lists[list_name] = list(dict.fromkeys(saved_lists[list_name]))
        except:
            saved_lists = {}
    else:
        saved_lists = {}

def save_lists_to_file():
    """Save keyword lists to JSON file"""
    global saved_lists
    
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
    
    lists_file = os.path.join(data_dir, 'saved_lists.json')
    with open(lists_file, 'w') as f:
        json.dump(saved_lists, f)

def load_keywords_data(sheet_name=None):
    """Load keywords data from the file, optionally from a specific sheet"""
    global keywords_data, current_sheet, data_file_path, available_sheets
    
    # Default data file path
    if not data_file_path:
        data_file_path = os.path.join(os.path.dirname(__file__), 'data', 'keywords.csv')
    
    # If we haven't detected sheets yet, do that now
    if not available_sheets and os.path.exists(data_file_path):
        available_sheets = detect_file_sheets(data_file_path)
    
    # Set current sheet if provided, or use the first one
    if sheet_name and sheet_name in available_sheets:
        current_sheet = sheet_name
    elif available_sheets and not current_sheet:
        current_sheet = available_sheets[0]
    
    if not os.path.exists(data_file_path):
        keywords_data = pd.DataFrame(columns=['keyword', 'volume', 'value'])
        return False
        
    try:
        # Check file extension to determine loading method
        file_extension = os.path.splitext(data_file_path)[1].lower()
        
        if file_extension in ['.xlsx', '.xls', '.xlsm'] and current_sheet:
            # For Excel files, load specific sheet
            keywords_data = pd.read_excel(
                data_file_path,
                sheet_name=current_sheet,
                dtype=str,
                na_values=['', 'nan', 'NaN', 'NA', 'null'],
                keep_default_na=False,
                engine='openpyxl'
            )
        else:
            # For CSV or when no sheet specified
            keywords_data = pd.read_csv(
                data_file_path,
                dtype=str,
                na_values=['', 'nan', 'NaN', 'NA', 'null'],
                keep_default_na=False
            )

        # Fill missing values with empty strings
        keywords_data = keywords_data.fillna('')

        # Rename columns to match our application's expected format
        if 'KW' in keywords_data.columns:
            column_mapping = {'KW': 'keyword', 'Volumn': 'volume', 'KD': 'value'}
            keywords_data = keywords_data.rename(columns=column_mapping)
        
        # If columns aren't properly mapped, try to identify them by position
        if 'keyword' not in keywords_data.columns and keywords_data.shape[1] >= 3:
            keywords_data.columns = ['keyword', 'volume', 'value'] + list(keywords_data.columns[3:])
        
        # Keep a lowercase copy for case-insensitive operations
        keywords_data['keyword_lower'] = keywords_data['keyword'].str.lower()

        # Handle CSV parsing issues if they occur
        if keywords_data.shape[1] == 1 and 'keyword' in keywords_data.columns:
            if keywords_data['keyword'].str.contains(',').any():
                keywords_data['keyword'] = keywords_data['keyword'].str.split(',').str[0]
                keywords_data['volume'] = ''
                keywords_data['value'] = ''

        return True
    except Exception:
        keywords_data = pd.DataFrame(columns=['keyword', 'volume', 'value'])
        return False

def clean_keyword(keyword):
    """Extract just the keyword part before any separator"""
    if isinstance(keyword, str) and ' – ' in keyword:
        return keyword.split(' – ')[0].strip()
    return keyword

@app.route('/')
def index():
    # Load saved lists when application starts
    load_saved_lists()
    return render_template('index.html')

@app.route('/api/sheets', methods=['GET'])
def get_sheets():
    """API endpoint to get available sheets"""
    global available_sheets, current_sheet
    
    # If we haven't loaded sheets yet, do it now
    if not available_sheets:
        load_keywords_data()
    
    return jsonify({
        'sheets': available_sheets,
        'current_sheet': current_sheet
    })

@app.route('/api/switch-sheet', methods=['POST'])
def switch_sheet():
    """API endpoint to switch to a different sheet"""
    data = request.get_json()
    sheet_name = data.get('sheet')
    
    if not sheet_name or sheet_name not in available_sheets:
        return jsonify({'error': 'Invalid sheet name'}), 400
    
    # Load data for the selected sheet
    success = load_keywords_data(sheet_name)
    
    if success:
        return jsonify({
            'success': True,
            'sheet': sheet_name
        })
    else:
        return jsonify({
            'success': False,
            'error': f"Failed to load sheet: {sheet_name}"
        }), 500

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Handle file upload and detect sheets"""
    global data_file_path, current_sheet, available_sheets
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    # Save the uploaded file
    filename = secure_filename(file.filename)
    upload_dir = os.path.join(os.path.dirname(__file__), 'data')
    
    # Create data directory if it doesn't exist
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)
    
    file_path = os.path.join(upload_dir, filename)
    file.save(file_path)
    
    # Set as the current data file
    data_file_path = file_path
    
    # Detect sheets in the file
    available_sheets = detect_file_sheets(file_path)
    
    if available_sheets:
        current_sheet = available_sheets[0]
        load_keywords_data(current_sheet)
        
        return jsonify({
            'success': True,
            'sheets': available_sheets,
            'current_sheet': current_sheet
        })
    else:
        return jsonify({
            'success': False,
            'error': 'No sheets found in the file'
        }), 400

@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    global keywords_data

    # Make sure we have the data loaded
    if keywords_data is None or keywords_data.empty:
        load_keywords_data()

    # If still no data, return empty array
    if keywords_data is None or keywords_data.empty:
        return jsonify({
            'results': [],
            'pagination': {
                'page': 1,
                'page_size': 100,
                'total_pages': 0,
                'total_results': 0
            },
            'sheet_info': {
                'current_sheet': current_sheet,
                'available_sheets': available_sheets
            }
        })

    # Get query parameters
    search_term = request.args.get('search', '').strip()
    sort_by = request.args.get('sort', 'keyword')
    sort_order = request.args.get('order', 'asc')
    threshold = float(request.args.get('threshold', 70))
    volume_filter = request.args.get('volume_filter', '').strip()
    search_type = request.args.get('search_type', 'partial')

    # Pagination parameters
    page = max(1, int(request.args.get('page', 1)))
    page_size = int(request.args.get('page_size', 200))

    # Verify sort column exists, if not use 'keyword'
    if sort_by not in keywords_data.columns:
        sort_by = 'keyword'

    # Use boolean indexing for more efficient filtering
    mask = pd.Series(True, index=keywords_data.index)

    # Apply volume filter if provided
    if volume_filter:
        if volume_filter == 'blank':
            # Filter for rows where volume is empty string or 'NA' (case-insensitive)
            mask &= (keywords_data['volume'] == '') | (keywords_data['volume'].str.lower() == 'na')
        elif volume_filter == '10K-100K':
            mask &= keywords_data['volume'].str.contains('10K', case=False, na=False)
        elif volume_filter == '100K-1M':
            mask &= keywords_data['volume'].str.contains('100K', case=False, na=False)
        elif volume_filter == '1M-10M':
            mask &= keywords_data['volume'].str.contains('1M', case=False, na=False)

    # Apply the mask to get filtered results
    filtered_data = keywords_data[mask]

    # Match percentage column for sorting
    filtered_data['match_percentage'] = 0.0

    # Only apply search filter if there's a search term
    if search_term:
        # Determine the scorer based on search type
        scorer = fuzz.partial_ratio if search_type == 'partial' else fuzz.ratio

        # Fast fuzzy match via RapidFuzz - more efficient batch processing
        all_keywords = filtered_data['keyword'].tolist()
        matches = {}
        
        # Process in batches for large datasets
        batch_size = 1000
        for i in range(0, len(all_keywords), batch_size):
            batch = all_keywords[i:i+batch_size]
            batch_matches = process.extract(
                search_term,
                batch,
                scorer=scorer,
                score_cutoff=threshold,
                limit=len(batch)
            )
            for m in batch_matches:
                matches[m[0]] = m[1]
        
        # Filter out non-matching keywords
        match_mask = filtered_data['keyword'].isin(matches.keys())
        filtered_data = filtered_data[match_mask].copy()
        
        # Add match percentages
        filtered_data['match_percentage'] = filtered_data['keyword'].map(matches)
        
        # Sort by match percentage, then by requested column
        filtered_data = filtered_data.sort_values(
            by=['match_percentage', sort_by],
            ascending=[False, sort_order == 'asc']
        )
    else:
        # For initial load or when no search term, just sort by the requested column
        filtered_data = filtered_data.sort_values(by=sort_by, ascending=(sort_order == 'asc'))

    # Calculate total number of pages
    total_results = len(filtered_data)
    total_pages = max(1, (total_results + page_size - 1) // page_size)

    # Ensure page is within bounds
    page = min(page, total_pages)

    # Apply pagination
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_results)
    paginated_data = filtered_data.iloc[start_idx:end_idx]

    # Convert to dictionary and ensure all fields are present
    result = [{
        'keyword': str(clean_keyword(row.get('keyword', ''))),
        'volume': str(row.get('volume', '')),
        'value': str(row.get('value', '')),
        'match_percentage': row.get('match_percentage', 0)
    } for _, row in paginated_data.iterrows()]

    # Return data with pagination metadata
    return jsonify({
        'results': result,
        'pagination': {
            'page': page,
            'page_size': page_size,
            'total_pages': total_pages,
            'total_results': total_results
        },
        'sheet_info': {
            'current_sheet': current_sheet,
            'available_sheets': available_sheets
        }
    })

@app.route('/api/export', methods=['POST'])
def export_keywords():
    global keywords_data, current_sheet

    # Load data if not already loaded
    if keywords_data is None or keywords_data.empty:
        load_keywords_data()

    # Get selected keywords from request
    data = request.get_json()
    selected_keywords = data.get('keywords', [])

    if not selected_keywords:
        return jsonify({'error': 'No keywords selected'}), 400

    # Clean selected keywords to match the format in the database
    cleaned_selected = [clean_keyword(kw) for kw in selected_keywords]

    # Use both original and cleaned keywords to ensure matches
    all_possible_keywords = set(selected_keywords + cleaned_selected)
    selected_data = keywords_data[keywords_data['keyword'].isin(all_possible_keywords)]

    # Create a CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)

    # Write headers - use original column names for export
    writer.writerow(['KW', 'Volumn', 'KD'])

    # Write selected data
    for _, row in selected_data.iterrows():
        writer.writerow([clean_keyword(row['keyword']), row['volume'], row['value']])

    # Prepare the CSV for download
    output.seek(0)
    
    # Include sheet name in the filename if available
    filename = f"selected_keywords_{current_sheet}.csv" if current_sheet else "selected_keywords.csv"

    return send_file(
        io.BytesIO(output.getvalue().encode()),
        as_attachment=True,
        download_name=filename,
        mimetype='text/csv'
    )

# API endpoints for saved keyword lists functionality

@app.route('/api/saved-lists', methods=['GET'])
def get_saved_lists():
    """API endpoint to get all saved keyword lists"""
    global saved_lists
    
    # Load saved lists if not already loaded
    if not saved_lists:
        load_saved_lists()
    
    result = [
        {'name': list_name, 'count': len(keywords)} 
        for list_name, keywords in saved_lists.items()
    ]
    
    return jsonify({'lists': result})

@app.route('/api/saved-list', methods=['GET'])
def get_saved_list():
    """API endpoint to get keywords from a specific saved list"""
    global saved_lists, keywords_data
    
    # Get list name from query parameters
    list_name = request.args.get('name', '').strip()
    
    if not list_name or list_name not in saved_lists:
        return jsonify({'error': 'Invalid list name'}), 400
    
    # Get keywords from the saved list and ensure no duplicates
    saved_keywords = list(dict.fromkeys(saved_lists[list_name]))
    
    # Match with the current dataset to get full details if available
    if keywords_data is not None and not keywords_data.empty:
        # Dictionary to store best match for each keyword
        keyword_details = {}
        
        # Filter the keywords data to include only saved keywords
        matched_data = keywords_data[keywords_data['keyword'].isin(saved_keywords)]
        
        # Group by keyword and select entry with highest volume
        for keyword in saved_keywords:
            # Get all entries for this keyword
            keyword_rows = matched_data[matched_data['keyword'] == keyword]
            
            if not keyword_rows.empty:
                # Prioritize rows with volume data (not NA or empty)
                has_volume = keyword_rows[(keyword_rows['volume'] != '') & (keyword_rows['volume'].str.lower() != 'na')]
                
                if not has_volume.empty:
                    # Use the first entry with volume
                    selected_row = has_volume.iloc[0]
                else:
                    # If no entry has volume, just use the first one
                    selected_row = keyword_rows.iloc[0]
                
                keyword_details[keyword] = {
                    'keyword': str(clean_keyword(selected_row.get('keyword', ''))),
                    'volume': str(selected_row.get('volume', '')),
                    'value': str(selected_row.get('value', ''))
                }
            else:
                # Add keyword with empty details if not found
                keyword_details[keyword] = {
                    'keyword': keyword,
                    'volume': '',
                    'value': ''
                }
        
        # Prepare results in the original order
        result = [keyword_details[kw] for kw in saved_keywords]
    else:
        # If no data is loaded, just return the keywords without volume and value
        result = [{'keyword': kw, 'volume': '', 'value': ''} for kw in saved_keywords]
    
    return jsonify({
        'list_name': list_name,
        'keywords': result
    })

@app.route('/api/save-list', methods=['POST'])
def save_keyword_list():
    """API endpoint to save a new keyword list"""
    global saved_lists
    
    data = request.get_json()
    list_name = data.get('name', '').strip()
    keywords = data.get('keywords', [])
    
    if not list_name:
        return jsonify({'error': 'List name is required'}), 400
    
    if not keywords:
        return jsonify({'error': 'No keywords provided'}), 400
    
    # Clean keywords
    cleaned_keywords = [clean_keyword(kw) for kw in keywords]
    
    # Remove duplicates by converting to set and back to list
    cleaned_keywords = list(dict.fromkeys(cleaned_keywords))
    
    # Save the list
    saved_lists[list_name] = cleaned_keywords
    
    # Save to file
    save_lists_to_file()
    
    return jsonify({
        'success': True,
        'list_name': list_name,
        'count': len(cleaned_keywords)
    })

@app.route('/api/delete-list', methods=['POST'])
def delete_keyword_list():
    """API endpoint to delete a saved keyword list"""
    global saved_lists
    
    data = request.get_json()
    list_name = data.get('name', '').strip()
    
    if not list_name or list_name not in saved_lists:
        return jsonify({'error': 'Invalid list name'}), 400
    
    # Delete the list
    del saved_lists[list_name]
    
    # Save changes to file
    save_lists_to_file()
    
    return jsonify({'success': True})

if __name__ == '__main__':
    # Ensure data folder exists
    data_dir = os.path.join(os.path.dirname(__file__), 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        
    # Load data once at startup
    load_keywords_data()
    # Load saved lists at startup
    load_saved_lists()
    app.run(debug=True)
