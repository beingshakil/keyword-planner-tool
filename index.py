from flask import Flask
from flask import render_template, request, jsonify, send_file
import pandas as pd
from rapidfuzz import process, fuzz
import os
import io
import csv

# For Excel file support
import openpyxl
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Global variables
keywords_data = None
available_sheets = []
current_sheet = None
data_file_path = None
file_extension = None

def detect_file_sheets(file_path):
    """Detect available sheets in the Excel file"""
    global available_sheets, file_extension
    
    file_extension = os.path.splitext(file_path)[1].lower()
    
    if file_extension in ['.xlsx', '.xls', '.xlsm']:
        try:
            # Use pandas Excel file functionality to get sheet names
            xls = pd.ExcelFile(file_path)
            sheet_names = xls.sheet_names
            available_sheets = sheet_names
            return sheet_names
        except Exception as e:
            available_sheets = []
            return []
    elif file_extension == '.csv':
        # CSV files don't have sheets, so use filename as the only "sheet"
        sheet_name = os.path.basename(file_path).split('.')[0]
        available_sheets = [sheet_name]
        return [sheet_name]
    return []

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
    
    if os.path.exists(data_file_path):
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
                    dtype={'KW': str, 'Volumn': str, 'KD': str},
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
                # Split the keyword column if it contains delimiter characters
                if keywords_data['keyword'].str.contains(',').any():
                    keywords_data['keyword'] = keywords_data['keyword'].str.split(',').str[0]
                    keywords_data['volume'] = ''
                    keywords_data['value'] = ''

            return True
        except Exception as e:
            keywords_data = pd.DataFrame(columns=['keyword', 'volume', 'value'])
            return False
    else:
        keywords_data = pd.DataFrame(columns=['keyword', 'volume', 'value'])
        return False

def clean_keyword(keyword):
    """Extract just the keyword part before any separator"""
    if isinstance(keyword, str) and ' – ' in keyword:
        return keyword.split(' – ')[0].strip()
    return keyword

@app.route('/')
def index():
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
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 200))

    # Verify sort column exists, if not use 'keyword'
    if sort_by not in keywords_data.columns:
        sort_by = 'keyword'

    # Use boolean indexing for more efficient filtering (avoids copy)
    mask = pd.Series(True, index=keywords_data.index)

    # Apply volume filter if provided - more efficient with boolean mask
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

    # Apply the mask to get filtered results - no need for a copy operation here
    filtered_data = keywords_data[mask]

    # Match percentage column for sorting
    filtered_data['match_percentage'] = 0.0

    # Only apply search filter if there's a search term
    if search_term:
        # Determine the scorer based on search type
        scorer = fuzz.partial_ratio if search_type == 'partial' else fuzz.ratio

        # Fast C-optimized fuzzy match via RapidFuzz - more efficient loop approach for large datasets
        # Gather all keywords for faster processing
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
    if page < 1:
        page = 1
    elif page > total_pages:
        page = total_pages

    # Apply pagination
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_results)
    paginated_data = filtered_data.iloc[start_idx:end_idx]

    # Convert to dictionary and ensure all fields are present
    result = []
    for _, row in paginated_data.iterrows():
        result.append({
            'keyword': str(clean_keyword(row.get('keyword', ''))),
            'volume': str(row.get('volume', '')),
            'value': str(row.get('value', '')),
            'match_percentage': row.get('match_percentage', 0)
        })

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

if __name__ == '__main__':
    # Install openpyxl if not already installed
    try:
        import openpyxl
    except ImportError:
        import subprocess
        subprocess.call(['pip', 'install', 'openpyxl'])
    
    # Load data once at startup
    load_keywords_data()
    app.run(debug=True)
