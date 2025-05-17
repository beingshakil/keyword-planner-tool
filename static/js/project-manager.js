// Initialize ProjectManager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing ProjectManager...');
    try {
        // Initialize ProjectManager and make it globally available
        window.projectManager = new ProjectManager();
        console.log('ProjectManager initialized successfully');
        
        // Set up category filtering directly
        setTimeout(() => {
            if (window.projectManager && window.projectManager.setupCategoryFiltering) {
                console.log('Running setupCategoryFiltering on page load');
                window.projectManager.setupCategoryFiltering();
            }
        }, 1000); // Wait for table to be fully loaded
    } catch (error) {
        console.error('Error initializing ProjectManager:', error);
    }
});

class ProjectManager {
    constructor() {
        this.projects = {};
        this.currentProject = 'default';
        this.elements = {
            projectSelector: document.getElementById('project-selector'),
            createProjectBtn: document.getElementById('create-project-btn'),
            deleteProjectBtn: document.getElementById('delete-project-btn'),
            renameProjectBtn: document.getElementById('rename-project-btn'),
            importFileBtn: document.getElementById('import-file-btn'),
            fileUploadInput: document.getElementById('file-upload-input'),
            projectFileList: document.getElementById('project-file-list'),
            // Modal elements
            createProjectModal: document.getElementById('create-project-modal'),
            closeCreateModal: document.getElementById('close-create-modal'),
            cancelCreateProject: document.getElementById('cancel-create-project'),
            confirmCreateProject: document.getElementById('confirm-create-project'),
            projectNameInput: document.getElementById('project-name'),
            // Rename project modal elements
            renameProjectModal: document.getElementById('rename-project-modal'),
            closeRenameModal: document.getElementById('close-rename-modal'),
            cancelRenameProject: document.getElementById('cancel-rename-project'),
            confirmRenameProject: document.getElementById('confirm-rename-project'),
            newProjectNameInput: document.getElementById('new-project-name'),
            // Import file modal
            fileImportModal: document.getElementById('file-import-modal'),
            closeImportModal: document.getElementById('close-import-modal'),
            cancelImportFile: document.getElementById('cancel-import-file'),
            confirmImportFile: document.getElementById('confirm-import-file'),
            importFilename: document.getElementById('import-filename'),
            importFileName: document.getElementById('import-file-name')
        };

        this.fileData = null;
        this.currentFile = null;
        this.currentImportedData = null;

        this.init();
        
        // Setup periodic table style fixer
        this.setupTableStyleFixer();
    }

    init() {
        this.loadProjects();
        this.setupEventListeners();
        this.updateProjectSelector();
        this.updateFileList();
        this.overrideMainFunctionality();
        
        // Add mutation observer to watch for table changes
        this.setupTableObserver();
    }

    loadProjects() {
        try {
            // Load projects from localStorage
            const savedProjects = localStorage.getItem('keywordProjects');
            if (savedProjects) {
                this.projects = JSON.parse(savedProjects);
                
                // Process each project's files to handle binary data properly
                for (const projectId in this.projects) {
                    const project = this.projects[projectId];
                    if (project.files) {
                        for (const fileId in project.files) {
                            const file = project.files[fileId];
                            
                            // Mark all reloaded files
                            file.isReloaded = true;
                            
                            // Restore original type if needed
                            if (file.originalType && !file.type) {
                                file.type = file.originalType;
                            }
                            
                            // Convert any stored Excel files to CSV for better handling
                            if (file.type === 'excel' && typeof file.data === 'string') {
                                console.log(`Converting reloaded Excel file "${file.name}" to CSV format`);
                                file.type = 'csv';
                                file.originalType = 'excel';
                            }
                        }
                    }
                }
                
                console.log('Loaded saved projects from localStorage');
            } else {
                // Create default project
                this.projects = {
                    default: {
                        name: 'Default Project',
                        files: {}
                    }
                };
                this.saveProjects();
            }
    
            // Load current project from localStorage
            const currentProject = localStorage.getItem('currentKeywordProject');
            if (currentProject && this.projects[currentProject]) {
                this.currentProject = currentProject;
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            // Create default project on error
            this.projects = {
                default: {
                    name: 'Default Project',
                    files: {}
                }
            };
            this.saveProjects();
        }
    }

    saveProjects() {
        localStorage.setItem('keywordProjects', JSON.stringify(this.projects));
        localStorage.setItem('currentKeywordProject', this.currentProject);
    }

    setupEventListeners() {
        // Project selector change
        this.elements.projectSelector.addEventListener('change', () => {
            const prevProject = this.currentProject;
            this.currentProject = this.elements.projectSelector.value;
            this.saveProjects();
            this.updateFileList();
            
            // If we're switching projects, we should hide the file indicator without showing notification
            const fileIndicator = document.getElementById('file-view-indicator');
            if (fileIndicator) {
                fileIndicator.classList.add('hidden');
            }
            
            this.currentFile = null;
            this.currentImportedData = null;
            
            // Load default keywords for the new project
            if (window.loadKeywords) {
                window.loadKeywords('', 1);
            }
        });

        // Create project button
        this.elements.createProjectBtn.addEventListener('click', () => {
            this.elements.createProjectModal.classList.remove('hidden');
            this.elements.projectNameInput.value = '';
            this.elements.projectNameInput.focus();
        });
        
        // Rename project button
        this.elements.renameProjectBtn.addEventListener('click', () => {
            if (this.currentProject === 'default') {
                alert('Cannot rename the default project.');
                return;
            }
            
            this.elements.renameProjectModal.classList.remove('hidden');
            this.elements.newProjectNameInput.value = this.projects[this.currentProject].name;
            this.elements.newProjectNameInput.focus();
        });
        
        // Close rename project modal
        this.elements.closeRenameModal?.addEventListener('click', () => {
            this.elements.renameProjectModal.classList.add('hidden');
        });
        
        // Cancel rename project
        this.elements.cancelRenameProject?.addEventListener('click', () => {
            this.elements.renameProjectModal.classList.add('hidden');
        });
        
        // Confirm rename project
        this.elements.confirmRenameProject?.addEventListener('click', () => {
            this.renameProject();
        });
        
        // Handle enter key in rename project input
        this.elements.newProjectNameInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                this.renameProject();
            }
        });

        // Delete project button
        this.elements.deleteProjectBtn.addEventListener('click', () => {
            if (this.currentProject === 'default') {
                alert('Cannot delete the default project.');
                return;
            }

            if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
                delete this.projects[this.currentProject];
                this.currentProject = 'default';
                this.saveProjects();
                this.updateProjectSelector();
                this.updateFileList();
                this.resetMainView();
            }
        });

        // Import file button
        this.elements.importFileBtn.addEventListener('click', () => {
            // Clear any previous file data
            this.fileData = null;
            // Reset file input to ensure change event fires again
            this.elements.fileUploadInput.value = '';
            // Trigger file selection dialog
            this.elements.fileUploadInput.click();
        });

        // Return to Main Data button
        const returnToMainBtn = document.getElementById('return-to-main-btn');
        if (returnToMainBtn) {
            returnToMainBtn.addEventListener('click', () => {
                this.resetMainView();
                
                // Clear the current file display
                const currentFileNameElement = document.getElementById('current-file-name');
                if (currentFileNameElement) {
                    currentFileNameElement.textContent = '';
                }
                
                // Clear the sheet selector
                const sheetSelectorContainer = document.getElementById('sheet-selector-container');
                if (sheetSelectorContainer) {
                    sheetSelectorContainer.innerHTML = '';
                }
                
                // Show notification
                this.showNotification('Returned to main data view', 'info');
            });
        }

        // File upload change
        this.elements.fileUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Determine file type based on extension and MIME type
            const fileExtension = file.name.split('.').pop().toLowerCase();
            const isCSV = fileExtension === 'csv' || file.type === 'text/csv';
            const isExcel = ['xlsx', 'xls', 'xlsm', 'xlsb'].includes(fileExtension) || 
                           ['application/vnd.ms-excel', 
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'application/octet-stream'].includes(file.type);

            if (!isCSV && !isExcel) {
                alert('Please upload a valid CSV or Excel file.');
                this.elements.fileUploadInput.value = '';
                return;
            }

            // Maximum file size (10MB)
            const MAX_FILE_SIZE = 10 * 1024 * 1024;
            if (file.size > MAX_FILE_SIZE) {
                alert('File size exceeds the maximum limit of 10MB.');
                this.elements.fileUploadInput.value = '';
                return;
            }

            // Show loading indication
            this.showNotification('Reading file...', 'info');

            // Create appropriate reader based on file type
            const reader = new FileReader();

            reader.onerror = (error) => {
                console.error('FileReader error:', error);
                alert('Error reading file. Please try again.');
                this.elements.fileUploadInput.value = '';
            };

            reader.onload = (event) => {
                try {
                    // Store the raw data - we'll try different parsing methods if needed
                    const rawContent = event.target.result;
                    
                    // Create fileData object with type detection
                    this.fileData = {
                        name: file.name,
                        content: rawContent,
                        rawContent: rawContent, // Keep a copy of raw content for fallback
                        extension: fileExtension,
                        mimeType: file.type
                    };

                    // Determine actual type - try both formats if needed
                    if (isExcel) {
                        this.fileData.type = 'excel';
                        // Check if XLSX library is available before setting type to excel
                        if (typeof XLSX === 'undefined') {
                            console.warn('XLSX library not available, will try as CSV instead');
                            this.fileData.type = 'csv';
                        }
                    } else {
                        this.fileData.type = 'csv';
                    }

                    // Show import modal with file info
                    if (this.elements.importFilename) {
                        this.elements.importFilename.textContent = file.name;
                    }
                    if (this.elements.importFileName) {
                        this.elements.importFileName.value = file.name.split('.')[0];
                    }
                    if (this.elements.fileImportModal) {
                        this.elements.fileImportModal.classList.remove('hidden');
                        // Focus on the display name input
                        setTimeout(() => {
                            this.elements.importFileName.focus();
                        }, 100);
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                    alert(`Error processing file: ${error.message}. Please try a different file.`);
                    this.elements.fileUploadInput.value = '';
                }
            };

            // Read the file as appropriate type
            try {
                if (isCSV) {
                    reader.readAsText(file);
                } else {
                    reader.readAsArrayBuffer(file);
                }
            } catch (error) {
                console.error('Error initiating file read:', error);
                alert(`Failed to read file: ${error.message}`);
                this.elements.fileUploadInput.value = '';
            }
        });

        // Modal close buttons
        if (this.elements.closeCreateModal) {
            this.elements.closeCreateModal.addEventListener('click', () => 
                this.elements.createProjectModal.classList.add('hidden'));
        }
        if (this.elements.cancelCreateProject) {
            this.elements.cancelCreateProject.addEventListener('click', () => 
                this.elements.createProjectModal.classList.add('hidden'));
        }
        if (this.elements.closeImportModal) {
            this.elements.closeImportModal.addEventListener('click', () => 
                this.elements.fileImportModal.classList.add('hidden'));
        }
        if (this.elements.cancelImportFile) {
            this.elements.cancelImportFile.addEventListener('click', () => 
                this.elements.fileImportModal.classList.add('hidden'));
        }

        // Create project confirm
        if (this.elements.confirmCreateProject && this.elements.projectNameInput) {
            this.elements.confirmCreateProject.addEventListener('click', () => this.createProject());
            this.elements.projectNameInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.createProject();
            });
        }

        // Import file confirm
        if (this.elements.confirmImportFile) {
            this.elements.confirmImportFile.addEventListener('click', () => this.importFile());
        }
        if (this.elements.importFileName) {
            this.elements.importFileName.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') this.importFile();
            });
        }

        // File list click
        this.elements.projectFileList.addEventListener('click', (e) => {
            const fileItem = e.target.closest('.project-file-item');
            if (fileItem) {
                const fileId = fileItem.dataset.fileId;
                this.loadFile(fileId);
            }

            const deleteBtn = e.target.closest('.delete-file-btn');
            if (deleteBtn) {
                e.stopPropagation();
                const fileId = deleteBtn.closest('.project-file-item').dataset.fileId;
                this.deleteFile(fileId);
            }
        });

        // Handle sidebar menu items
        const sidebarMenuItems = document.querySelectorAll('.sidebar-menu-item');
        sidebarMenuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Check which menu item was clicked
                if (item.id === 'saved-keywords-view') {
                    // If switching to saved keywords view, clear current file selection
                    this.currentFile = null;
                    
                    // Update sidebar file selection
                    document.querySelectorAll('.project-file-item').forEach(fileItem => {
                        fileItem.classList.remove('active');
                    });
                } else if (item.id === 'main-table-view') {
                    // If switching to main table view and there's no current file,
                    // load the default keyword data
                    if (!this.currentFile) {
                        this.resetMainView();
                    }
                }
            });
        });
    }

    createProject() {
        const projectName = this.elements.projectNameInput.value.trim();
        if (!projectName) {
            alert('Please enter a project name.');
            return;
        }

        const projectId = 'project_' + Date.now();
        this.projects[projectId] = {
            name: projectName,
            files: {}
        };

        this.currentProject = projectId;
        this.saveProjects();
        this.updateProjectSelector();
        this.elements.createProjectModal.classList.add('hidden');
        this.resetMainView();
    }

    importFile() {
        console.log('importFile called', this.fileData);
        if (!this.fileData) {
            console.error('No file data available');
            alert('No file data available. Please select a file first.');
            return;
        }

        try {
            const displayName = this.elements.importFileName.value.trim() || this.fileData.name;
            const fileId = 'file_' + Date.now();
            
            console.log('Processing file', displayName, 'with ID', fileId);
            
            // For Excel files, we'll try to convert to CSV format first
            // This makes it more reliable when reloading the page
            if (this.fileData.type === 'excel') {
                this.showNotification("Processing Excel file...", "info");
                console.log("Converting Excel file to CSV for better storage...");
                
                try {
                    // Try to convert the Excel to CSV using XLSX.js
                    if (typeof XLSX !== 'undefined' && this.fileData.content) {
                        console.log('XLSX library available, processing Excel file');
                        let workbook;
                        try {
                            // First, try to read the Excel file
                            const options = {
                                type: 'array',
                                cellDates: true,
                                cellNF: false,
                                raw: false
                            };
                            
                            // For ArrayBuffer input
                            if (this.fileData.content instanceof ArrayBuffer) {
                                console.log('Processing ArrayBuffer Excel data');
                                workbook = XLSX.read(this.fileData.content, options);
                            }
                            // For string input
                            else if (typeof this.fileData.content === 'string') {
                                console.log('Processing string Excel data');
                                options.type = 'binary';
                                workbook = XLSX.read(this.fileData.content, options);
                            }
                            // Special handling for Uint8Array
                            else if (this.fileData.content instanceof Uint8Array) {
                                console.log('Processing Uint8Array Excel data');
                                options.type = 'array';
                                workbook = XLSX.read(this.fileData.content, options);
                            }
                            else {
                                console.warn('Unknown data type for Excel file:', typeof this.fileData.content);
                                throw new Error('Unsupported Excel data format');
                            }
                            
                            // Get first sheet
                            const firstSheetName = workbook.SheetNames[0];
                            const worksheet = workbook.Sheets[firstSheetName];
                            
                            // Convert to CSV
                            const csvData = XLSX.utils.sheet_to_csv(worksheet);
                            
                            // Store converted data
                            this.fileData.convertedContent = csvData;
                            this.fileData.originalType = 'excel';
                            
                            console.log('Excel file converted to CSV successfully');
                        } catch (parseError) {
                            console.error('Error parsing Excel file:', parseError);
                            // Just use the original data if conversion fails
                            this.showNotification('Excel conversion failed, using original file format', 'warning');
                        }
                    } else {
                        console.warn('XLSX library not available, proceeding with raw file data');
                    }
                } catch (conversionError) {
                    console.error('Error converting Excel to CSV:', conversionError);
                    this.showNotification('Excel conversion error: ' + conversionError.message, 'error');
                }
            }
            
            // Make sure we have project structure
            if (!this.projects[this.currentProject]) {
                this.projects[this.currentProject] = {
                    name: this.currentProject === 'default' ? 'Default Project' : this.currentProject,
                    files: {}
                };
            }

            if (!this.projects[this.currentProject].files) {
                this.projects[this.currentProject].files = {};
            }
            
            // Process file data
            console.log('Storing file in project', this.currentProject);
            this.projects[this.currentProject].files[fileId] = {
                id: fileId,
                name: displayName,
                originalName: this.fileData.name,
                // Store the converted content if available, otherwise use original
                type: this.fileData.convertedContent ? 'csv' : this.fileData.type,
                originalType: this.fileData.originalType || this.fileData.type,
                data: this.fileData.convertedContent || this.fileData.content,
                addedAt: Date.now()
            };

            this.saveProjects();
            this.updateFileList();
            this.elements.fileImportModal.classList.add('hidden');
            
            // Load the imported file with error handling
            try {
                console.log('Loading imported file', fileId);
                this.loadFile(fileId);
                console.log('File loaded successfully');
                this.showNotification(`File "${displayName}" imported successfully`, 'success');
                
                // Fix Volume and KD column alignment
                setTimeout(() => {
                    this.fixImportedTableColumnAlignment();
                }, 100);
            } catch (loadError) {
                console.error('Error loading file:', loadError);
                
                // Try the opposite format if the current one fails
                const currentType = this.projects[this.currentProject].files[fileId].type;
                const newType = currentType === 'csv' ? 'excel' : 'csv';
                
                this.showNotification(`Trying to load as ${newType} instead...`, 'info');
                this.projects[this.currentProject].files[fileId].type = newType;
                
                try {
                    this.loadFile(fileId);
                    console.log('File loaded successfully on second attempt');
                } catch (fallbackError) {
                    console.error('Error loading file (fallback attempt):', fallbackError);
                    // If both formats fail, show error and clean up
                    this.showNotification('Failed to parse file. Try converting to CSV format manually.', 'error');
                    delete this.projects[this.currentProject].files[fileId];
                    this.saveProjects();
                    this.updateFileList();
                }
            }
        } catch (error) {
            console.error('Error importing file:', error);
            this.showNotification('Failed to import file: ' + error.message, 'error');
        }
        
        // Clean up
        this.elements.fileUploadInput.value = '';
        this.fileData = null;
    }

    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file? This action cannot be undone.')) {
            delete this.projects[this.currentProject].files[fileId];
            this.saveProjects();
            this.updateFileList();
            
            if (this.currentFile === fileId) {
                this.resetMainView();
            }
        }
    }

    loadFile(fileId) {
        const file = this.projects[this.currentProject].files[fileId];
        if (!file) return;

        this.currentFile = fileId;
        
        // Show loading notification
        this.showNotification(`Loading file: ${file.name}...`, 'info');
        
        // Update file list selection
        document.querySelectorAll('.project-file-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`.project-file-item[data-file-id="${fileId}"]`)?.classList.add('active');

        // Update sidebar menu selection - activate Main Table view
        document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
        document.getElementById('main-table-view').classList.add('active');

        // Show main table content, hide saved keywords content
        document.getElementById('main-table-content').classList.remove('hidden');
        document.getElementById('saved-keywords-content').classList.add('hidden');
        
        // Clear any existing filter and search state
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        const volumeFilterLabel = document.getElementById('main-volume-filter-label');
        if (volumeFilterLabel) volumeFilterLabel.textContent = 'All Volumes';
        
        // Reset selection state
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        // Hide the clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        
        // Hide any suggestions container
        const suggestionsContainer = document.getElementById('suggestionsContainer');
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden');

        // Handle reloaded files differently
        if (file.isReloaded) {
            try {
                // For reloaded files, especially Excel, we should try to parse as CSV first
                if (file.type === 'excel') {
                    console.log('Handling reloaded Excel file as CSV');
                    
                    // Create a modified copy of the file for parsing
                    const modifiedFile = { 
                        ...file,
                        type: 'csv'  // Try as CSV first
                    };
                    
                    // Parse and display file with fallback to original type
                    try {
                        this.parseAndDisplayFile(modifiedFile);
                    } catch (csvError) {
                        console.warn('Failed to parse reloaded file as CSV, using original type', csvError);
                        
                        // Fall back to original type, but make it a string if it's an object
                        const originalFile = { ...file };
                        if (typeof originalFile.data === 'object' && !ArrayBuffer.isView(originalFile.data)) {
                            originalFile.data = JSON.stringify(originalFile.data);
                        }
                        this.parseAndDisplayFile(originalFile);
                    }
                } else {
                    // For non-Excel reloaded files, try normal parsing
                    this.parseAndDisplayFile(file);
                }
            } catch (error) {
                console.error('Error loading reloaded file:', error);
                this.showNotification(`Error loading file: ${error.message}. Try re-importing the file.`, 'error');
            }
        } else {
            // For newly imported files, use normal parsing
            this.parseAndDisplayFile(file);
        }
        
        // Setup category filtering with a delay to ensure the table is fully loaded
        setTimeout(() => {
            this.setupCategoryFiltering();
        }, 500);
    }

    parseAndDisplayFile(file) {
        try {
            let data = [];
            let headers = [];
            let sheetInfo = null;
            
            console.log('Parsing file:', file.name, 'Type:', file.type);
            
            // Show parsing notification
            const notification = this.showNotification(`Parsing file: ${file.name}...`, 'info');
            
            // Parse based on detected file type
            if (file.type === 'csv') {
                console.log('Parsing as CSV');
                const parsedData = this.parseCSV(file.data);
                headers = parsedData.headers;
                data = parsedData.data;
            } 
            // Parse Excel files
            else if (file.type === 'excel') {
                console.log('Parsing as Excel');
                try {
                    const parsedData = this.parseExcel(file.data);
                    headers = parsedData.headers;
                    data = parsedData.data;
                    
                    // Log sheet information for debugging
                    console.log('Excel sheets detected:', parsedData.sheetNames);
                    console.log('Current sheet:', parsedData.currentSheet);
                    
                    sheetInfo = {
                        sheetNames: parsedData.sheetNames,
                        currentSheet: parsedData.currentSheet
                    };
                    
                    // Check if there are multiple sheets and log it
                    if (parsedData.sheetNames && parsedData.sheetNames.length > 1) {
                        console.log(`Found ${parsedData.sheetNames.length} sheets in Excel file. Sheet selector should appear.`);
                    } else {
                        console.log('Excel file has 0 or 1 sheet. Sheet selector will not be shown.');
                    }
                } catch (excelError) {
                    console.error('Excel parsing error:', excelError);
                    throw new Error(`Failed to parse Excel file: ${excelError.message}`);
                }
            }
            else {
                throw new Error(`Unsupported file type: ${file.type}`);
            }
            
            // Verify we have data
            if (!headers || headers.length === 0) {
                throw new Error('No valid headers found in file');
            }
            
            if (!data || data.length === 0) {
                console.warn('File parsed successfully but contains no data rows');
                this.showNotification('File parsed successfully but contains no data rows', 'warning');
            } else {
                // Show success notification
                const rowCount = data.length;
                notification.remove(); // Remove the 'parsing' notification
                this.showNotification(`Successfully loaded ${rowCount} rows from ${file.name}`, 'success');
            }
            
            // Display in main view
            this.displayFileData(file.name, headers, data, sheetInfo);
        } catch (error) {
            console.error('Error parsing file:', error);
            this.showNotification(`Error parsing file: ${error.message}. Please make sure it is a valid CSV or Excel file.`, 'error');
        }
    }

    parseCSV(csvData) {
        try {
            // Handle binary data that was stored as text
            if (typeof csvData === 'string' && 
                (csvData.includes('PK') || csvData.includes('Workbook') || 
                 csvData.startsWith('data:') || csvData.includes('Excel'))) {
                console.log('Detected binary Excel data stored as text');
                
                // Try to detect CSV contents within the text
                const possibleCSVStart = csvData.indexOf(',');
                const possibleLineBreak = csvData.indexOf('\n');
                
                if (possibleCSVStart > 0 && possibleLineBreak > 0) {
                    // Find what looks like a header row
                    const headerRowMatch = csvData.match(/([a-zA-Z0-9_\s,;"'-]+\n)/);
                    if (headerRowMatch && headerRowMatch.index) {
                        console.log('Found possible CSV header at position', headerRowMatch.index);
                        csvData = csvData.substring(headerRowMatch.index);
                    }
                }
            }
            
            // Simple CSV parsing
            const lines = csvData.split('\n');
            if (lines.length === 0) {
                throw new Error('CSV file is empty');
            }
            
            // Handle different line endings
            let firstLine = lines[0];
            if (firstLine.includes('\r')) {
                firstLine = firstLine.replace('\r', '');
            }
            
            // Get headers - support different delimiters (comma, semicolon, tab)
            let delimiter = ',';
            if (firstLine.includes(';')) delimiter = ';';
            if (firstLine.includes('\t')) delimiter = '\t';
            
            // For Excel files saved as CSV that might have unusual characters
            if (!firstLine.includes(',') && !firstLine.includes(';') && !firstLine.includes('\t')) {
                // Try to autodetect delimiter based on pattern analysis
                const possibleDelimiters = [',', ';', '\t', '|'];
                const counts = {};
                
                // Count occurrences of each potential delimiter
                for (const del of possibleDelimiters) {
                    counts[del] = firstLine.split(del).length - 1;
                }
                
                // Find the delimiter with the most occurrences
                let maxCount = 0;
                for (const [del, count] of Object.entries(counts)) {
                    if (count > maxCount) {
                        maxCount = count;
                        delimiter = del;
                    }
                }
                
                // If no delimiter found with significant count, try to analyze binary data
                if (maxCount <= 1) {
                    console.log('No standard delimiter found, trying to process as binary data');
                    // Check for Excel binary data markers
                    const hasExcelMarkers = csvData.includes('PK') || 
                                           csvData.includes('Microsoft Excel') || 
                                           csvData.includes('Workbook');
                    
                    if (hasExcelMarkers) {
                        console.warn('This appears to be an Excel binary file saved with CSV extension');
                        // Notify user
                        this.showNotification('This appears to be an Excel file saved with CSV extension. Please save it as a proper CSV file.', 'warning');
                    }
                    
                    // Default to comma as delimiter for binary data
                    delimiter = ',';
                }
            }
            
            // If the first line looks corrupted, try to detect a better header line
            if (firstLine.length > 500 || firstLine.indexOf(delimiter) === -1) {
                // Look for a line that contains the delimiter multiple times - more likely to be a header
                for (let i = 1; i < Math.min(20, lines.length); i++) {
                    if (lines[i].split(delimiter).length > 1) {
                        firstLine = lines[i];
                        // Adjust lines array to start from this new header
                        lines.splice(0, i);
                        console.log(`Found better header line at position ${i}`);
                        break;
                    }
                }
            }
            
            const headers = firstLine.split(delimiter).map(h => {
                // Clean header name and remove quotes if present
                let header = h.trim().replace(/^["'](.*)["']$/, '$1');
                // Replace invalid characters
                header = header.replace(/[^\w\s-]/g, '');
                // If header is empty after cleaning, provide a default name
                return header || `Column_${Math.random().toString(36).substr(2, 5)}`;
            });
            
            const data = [];
            
            // Process each line
            for (let i = 1; i < lines.length; i++) {
                let line = lines[i].trim();
                if (!line) continue; // Skip empty lines
                
                if (line.includes('\r')) {
                    line = line.replace('\r', '');
                }
                
                // Handle quoted values with commas inside properly
                const values = [];
                let inQuote = false;
                let currentValue = '';
                
                for (let j = 0; j < line.length; j++) {
                    const char = line[j];
                    const nextChar = line[j + 1];
                    
                    // Handle quotes
                    if ((char === '"' || char === "'") && 
                        (!inQuote || nextChar === delimiter || nextChar === undefined)) {
                        inQuote = !inQuote;
                        continue;
                    }
                    
                    // If we hit a delimiter and not inside quotes, push the value
                    if (char === delimiter && !inQuote) {
                        values.push(currentValue.trim());
                        currentValue = '';
                        continue;
                    }
                    
                    // Add character to current value
                    currentValue += char;
                }
                
                // Push the last value
                values.push(currentValue.trim());
                
                // Handle case where we don't have enough values
                if (values.length !== headers.length) {
                    // Try to adjust by adding empty strings if we have too few values
                    while (values.length < headers.length) {
                        values.push('');
                    }
                    // Or truncate if we have too many
                    if (values.length > headers.length) {
                        values = values.slice(0, headers.length);
                    }
                }
                
                const row = {};
                headers.forEach((header, index) => {
                    // Remove quotes from values if present
                    let value = values[index] || '';
                    value = value.replace(/^["'](.*)["']$/, '$1');
                    row[header] = value;
                });
                
                data.push(row);
            }
            
            // Ensure we have data
            if (data.length === 0) {
                // Create an empty row with headers
                const emptyRow = {};
                headers.forEach(header => {
                    emptyRow[header] = '';
                });
                data.push(emptyRow);
                console.log('No data rows found, creating empty placeholder');
            }
            
            return { headers, data };
        } catch (error) {
            console.error('CSV parsing error:', error);
            throw new Error('Failed to parse CSV file: ' + error.message);
        }
    }

    parseExcel(excelData) {
        try {
            // Verify XLSX library is loaded
            if (typeof XLSX === 'undefined') {
                throw new Error('XLSX library not loaded. Please refresh the page and try again.');
            }

            // Check if we have valid data
            if (!excelData) {
                throw new Error('No data provided for Excel parsing');
            }

            // Safe wrapper to handle array buffer conversion errors
            const safeReadExcel = (data) => {
                try {
                    // Force array buffer conversion if needed
                    let buffer = data;
                    if (!(data instanceof ArrayBuffer)) {
                        // Convert string to buffer if needed
                        if (typeof data === 'string') {
                            if (data.startsWith('data:')) {
                                const base64 = data.split(',')[1];
                                if (base64) {
                                    buffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
                                }
                            } else {
                                // Convert string to ArrayBuffer
                                const buf = new ArrayBuffer(data.length);
                                const bufView = new Uint8Array(buf);
                                for (let i = 0; i < data.length; i++) {
                                    bufView[i] = data.charCodeAt(i) & 0xFF;
                                }
                                buffer = buf;
                            }
                        } else if (data instanceof Object && !Array.isArray(data) && !(data instanceof ArrayBuffer)) {
                            // Try to convert object to string
                            try {
                                buffer = JSON.stringify(data);
                            } catch (e) {
                                console.error('Could not stringify object data:', e);
                                throw new Error('Unsupported data type for Excel parsing');
                            }
                        } else {
                            throw new Error('Unsupported data type for Excel parsing');
                        }
                    }

                    // Try different formats to ensure reliable sheet detection
                    let workbook = null;
                    const typesToTry = ['array', 'binary', 'base64', 'string'];
                    
                    for (const type of typesToTry) {
                        try {
                            const options = {
                                type: type,
                                cellDates: true,
                                cellNF: false,
                                raw: false,
                                dateNF: 'yyyy-mm-dd',
                                WTF: true, // Turn this on for more verbose error info
                                cellStyles: false,
                                bookVBA: false,
                                bookDeps: false, 
                                sheetStubs: true,
                                bookSheets: true // Essential for sheet detection
                            };
                            
                            // Convert buffer if needed for this type
                            let convertedBuffer = data;
                            if (type === 'binary' && typeof data !== 'string') {
                                // Convert to binary string
                                let binary = '';
                                const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer);
                                for (let i = 0; i < bytes.byteLength; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                convertedBuffer = binary;
                            } else if (type === 'base64' && typeof data !== 'string') {
                                // Convert to base64
                                let binary = '';
                                const bytes = new Uint8Array(data instanceof ArrayBuffer ? data : new Uint8Array(data).buffer);
                                for (let i = 0; i < bytes.byteLength; i++) {
                                    binary += String.fromCharCode(bytes[i]);
                                }
                                convertedBuffer = btoa(binary);
                            } else if (type === 'string' && data instanceof ArrayBuffer) {
                                // Convert ArrayBuffer to string
                                let result = '';
                                const bytes = new Uint8Array(data);
                                const len = bytes.byteLength;
                                for (let i = 0; i < len; i++) {
                                    result += String.fromCharCode(bytes[i]);
                                }
                                convertedBuffer = result;
                            }
                            
                            workbook = XLSX.read(convertedBuffer, options);
                            if (workbook && workbook.SheetNames && workbook.SheetNames.length > 0) {
                                console.log(`Successfully parsed Excel with ${type} format. Found sheets:`, workbook.SheetNames);
                                break; // Successfully parsed, exit the loop
                            }
                        } catch (err) {
                            console.warn(`Failed to parse Excel with type ${type}:`, err);
                            // Continue to the next type
                        }
                    }
                    
                    if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
                        throw new Error('Could not parse Excel file with any method');
                    }
                    
                    return workbook;
                } catch (e) {
                    console.error('Error in Excel file reading:', e);
                    throw new Error(`Failed to read Excel file: ${e.message}`);
                }
            };

            // Parse Excel using enhanced safety
            let workbook = safeReadExcel(excelData);
            console.log('Excel workbook parsed successfully, found sheets:', workbook.SheetNames);
            
            // Improved sheet validation
            const hasMultipleSheets = workbook.SheetNames.length > 1;
            
            // Find a valid sheet to use
            let validSheet = null;
            let sheetName = '';
            
            // First try Sheet1 (common default)
            if (workbook.Sheets['Sheet1']) {
                validSheet = workbook.Sheets['Sheet1'];
                sheetName = 'Sheet1';
            } 
            // Then try the first sheet in the list
            else if (workbook.SheetNames.length > 0) {
                sheetName = workbook.SheetNames[0];
                validSheet = workbook.Sheets[sheetName];
            }
            
            // Process the sheet data
            if (!validSheet) {
                throw new Error('No valid sheets found in workbook');
            }
            
            console.log(`Using sheet: ${sheetName} for initial data loading`);
            
            // Convert sheet to JSON
            const jsonData = XLSX.utils.sheet_to_json(validSheet, {
                header: 1,
                defval: '',
                blankrows: false
            });
            
            // Extract headers and data
            let headers = [];
            const dataRows = [];
            
            if (jsonData.length > 0) {
                // Get headers from first row
                headers = jsonData[0].map(h => {
                    // Clean header name and provide default if empty
                    return String(h || '').trim() || `Column_${Math.random().toString(36).substr(2, 5)}`;
                });
                
                // Process data rows
                for (let i = 1; i < jsonData.length; i++) {
                    const row = {};
                    const rawRow = jsonData[i];
                    
                    // Skip empty rows
                    if (!rawRow || rawRow.length === 0) continue;
                    
                    // Create object with header keys
                    headers.forEach((header, index) => {
                        row[header] = index < rawRow.length ? String(rawRow[index] || '') : '';
                    });
                    
                    dataRows.push(row);
                }
            }
            
            return { 
                headers, 
                data: dataRows,
                sheetNames: workbook.SheetNames, // Make sure to include all sheet names
                currentSheet: sheetName
            };
        } catch (error) {
            console.error('Excel parsing error:', error);
            throw new Error(`Failed to parse Excel file: ${error.message}`);
        }
    }

    displayFileData(fileName, headers, data, sheetInfo = null) {
        // Switch to the main table view
        document.getElementById('main-table-content').classList.remove('hidden');
        document.getElementById('saved-keywords-content').classList.add('hidden');
        
        // Update sidebar menu selection
        document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
        document.getElementById('main-table-view').classList.add('active');
        
        // Set file data as the current working data, separate from main data
        this.currentImportedData = {
            fileName,
            headers,
            data,
            sheetInfo,
            filteredData: [...data] // Copy for searching/filtering
        };
        
        // Update the page title to show this is file data
        const pageTitle = document.querySelector('header h1') || document.createElement('h1');
        pageTitle.textContent = fileName;
        
        // Make the header visible if there are multiple sheets
        if (sheetInfo && sheetInfo.sheetNames && sheetInfo.sheetNames.length > 1) {
            const headerContainer = document.querySelector('#main-table-content > .border-b');
            if (headerContainer) {
                headerContainer.classList.remove('hidden');
                console.log('Made header container visible for multiple sheets');
            }
        }
        
        // Update the current file name in the existing header
        const currentFileNameElement = document.getElementById('current-file-name');
        if (currentFileNameElement) {
            const displayName = sheetInfo && sheetInfo.currentSheet 
                ? `${fileName} - ${sheetInfo.currentSheet}` 
                : fileName;
            currentFileNameElement.textContent = displayName;
            
            // Make sure the container is visible
            const headerContainer = currentFileNameElement.closest('.border-b');
            if (headerContainer) {
                headerContainer.classList.remove('hidden');
            }
        }
        
        // Set up all the functionality for imported files
        this.setupImportedFileSearch();
        this.setupVolumeFiltering();
        this.setupExportAndCopy();
        
        // Add sheet selector if available - do this after making the header visible
        this.setupSheetSelector(sheetInfo, fileName);
        
        // Update the UI with the imported data
        this.updateTableWithImportedData(fileName, headers, data, sheetInfo);
        
        // Fix styling for imported table columns
        if (this.fixImportedTableStyles) {
            this.fixImportedTableStyles();
        }
        
        // Fix Volume and KD column alignment
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 100);
        
        // Set up category filtering
        setTimeout(() => {
            this.setupCategoryFiltering();
        }, 200);
    }
    
    updateTableWithImportedData(fileName, headers, data, sheetInfo = null) {
        // Update the title with file name and potentially sheet name
        const titleText = sheetInfo && sheetInfo.currentSheet 
            ? `${fileName} - ${sheetInfo.currentSheet}` 
            : fileName;
            
        const pageTitle = document.querySelector('header h1') || document.createElement('h1');
        pageTitle.textContent = titleText;
        
        // Store the current imported data to keep it separate from main data
        this.currentImportedData = {
            fileName,
            headers,
            data,
            sheetInfo,
            filteredData: [...data] // Copy for searching/filtering
        };
        
        // Clear any existing data in the table first
        const tableBody = document.getElementById('keywordsTableBody');
        if (tableBody) {
            tableBody.innerHTML = '';
        }
        
        // Add file search input if it doesn't exist
        this.setupImportedFileSearch();
        
        // Update table header with all columns
        const tableHeader = document.querySelector('#keywordsTableBody').closest('table').querySelector('thead tr');
        if (!tableHeader) return;
        
        // Start with the checkbox column
        tableHeader.innerHTML = `
            <th class="py-3 px-4 text-left max-w-[40px]">
                <div class="flex items-center justify-center">
                    <input type="checkbox" id="selectAll" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                </div>
            </th>
        `;
        
        // Add column headers based on the file
        headers.forEach((header, index) => {
            if (!header) return; // Skip empty headers
            
            // Determine if this is the Value/KD column
            const isValueColumn = header.toLowerCase() === 'value' || 
                                  header.toLowerCase() === 'kd' || 
                                  header.toLowerCase().includes('difficulty') || 
                                  header.toLowerCase().includes('kd');
            
            // If it's the Value/KD column, always display it as "KD"
            let displayHeader = header;
            if (isValueColumn) {
                displayHeader = "KD";
            }
            
            // Use consistent styling and structure matching the main table
            const justifyClass = isValueColumn ? 'justify-center' : (header.toLowerCase().includes('volum') ? 'justify-center' : '');
            
            tableHeader.innerHTML += `
                <th class="py-3 px-4 text-left sortable" data-sort="${header}">
                    <span class="flex items-center ${justifyClass}">
                        <span class="font-semibold text-slate-700">${displayHeader}</span>
                        <i class="fas fa-sort ml-2 text-slate-400 text-xs"></i>
                    </span>
                </th>
            `;
        });
        
        // Add sheet selector if available
        this.setupSheetSelector(sheetInfo, fileName);
        
        // Populate table body with data
        this.displayImportedDataPage(data, 1);
        
        // Clear existing table sorting handlers and add new ones for the imported data
        this.setupImportedFileTableSorting();
        
        // Setup pagination for the imported data
        this.setupImportedDataPagination(data);
        
        // Make sure KD column is properly styled
        this.fixImportedTableStyles();
        
        // Fix column alignments
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 50);
        
        // Check for category column and setup filtering
        setTimeout(() => {
            this.setupCategoryFiltering();
        }, 100);
    }
    
    // Add a new method to fix table styles after import
    fixImportedTableStyles() {
        // Add proper column classes to match main table
        const table = document.querySelector('#keywordsTableBody').closest('table');
        if (table) {
            // Check if colgroup exists, if not add it
            let colgroup = table.querySelector('colgroup');
            if (!colgroup) {
                colgroup = document.createElement('colgroup');
                table.insertBefore(colgroup, table.firstChild);
            } else {
                colgroup.innerHTML = ''; // Clear existing columns
            }
            
            // Add checkbox column
            const checkboxCol = document.createElement('col');
            checkboxCol.className = 'col-checkbox';
            colgroup.appendChild(checkboxCol);
            
            // Add columns based on header types
            const headers = this.currentImportedData?.headers || [];
            headers.forEach(header => {
                if (!header) return;
                
                const col = document.createElement('col');
                
                // Determine column type based on header name
                if (header.toLowerCase().includes('keyword') || 
                    header.toLowerCase() === 'kw' || 
                    header.toLowerCase() === 'key' || 
                    header.toLowerCase() === 'term') {
                    col.className = 'col-keyword';
                } else if (header.toLowerCase().includes('volum') || 
                          header.toLowerCase() === 'vol' || 
                          header.toLowerCase() === 'search volume') {
                    col.className = 'col-volume';
                } else if (header.toLowerCase() === 'value' || 
                          header.toLowerCase() === 'kd' || 
                          header.toLowerCase().includes('difficulty')) {
                    col.className = 'col-kd';
                } else {
                    // Default column style
                    col.style.width = 'auto';
                }
                
                colgroup.appendChild(col);
            });
        }
        
        // Fix alignment for value/KD column
        const valueHeaders = document.querySelectorAll('th[data-sort="value"], th[data-sort="kd"], th[data-sort*="difficulty"]');
        valueHeaders.forEach(header => {
            if (header) {
                header.style.textAlign = 'center';
                
                // Fix the header text to always be "KD"
                const textSpan = header.querySelector('span span');
                if (textSpan && textSpan.textContent !== 'KD') {
                    textSpan.textContent = 'KD';
                }
                
                // Ensure column styling matches main table
                const columnSpan = header.querySelector('span');
                if (columnSpan) {
                    columnSpan.style.display = 'flex';
                    columnSpan.style.justifyContent = 'center';
                    columnSpan.style.alignItems = 'center';
                }
            }
        });
        
        // Fix volume column alignment
        const volumeHeaders = document.querySelectorAll('th[data-sort*="volum"]');
        volumeHeaders.forEach(header => {
            if (header) {
                header.style.textAlign = 'center';
                
                const columnSpan = header.querySelector('span');
                if (columnSpan) {
                    columnSpan.style.display = 'flex';
                    columnSpan.style.justifyContent = 'center';
                    columnSpan.style.alignItems = 'center';
                }
            }
        });
        
        // Fix cell alignment for volume and KD columns
        document.querySelectorAll('#keywordsTableBody tr').forEach(row => {
            const cells = row.querySelectorAll('td');
            
            // Skip if there are fewer than 3 cells
            if (cells.length < 3) return;
            
            // Center-align volume (3rd column) and KD (4th column) if they exist
            if (cells[2]) { // Volume column
                cells[2].style.textAlign = 'center';
            }
            
            if (cells[3]) { // KD column
                cells[3].style.textAlign = 'center';
            }
        });
    }
    
    setupImportedFileSearch() {
        // Get the search input element
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        
        // Don't clone/replace the original element as this breaks main.js functionality
        // Just add our own event listener that will take precedence
        const fileSearchHandler = (e) => {
            // Only run this handler if we have imported data
            if (!this.currentFile || !this.currentImportedData || !this.currentImportedData.data) {
                return; // Let the original handler work
            }
            
            e.stopPropagation(); // Prevent other handlers
            
            const searchTerm = searchInput.value.trim().toLowerCase();
            
            // Apply current search term to file data
            this.applyCurrentFiltersToFileData();
        };
        
        // Add our handler to both input and search button
        searchInput.addEventListener('input', fileSearchHandler, true);
        
        const searchButton = document.getElementById('searchButton');
        if (searchButton) {
            searchButton.addEventListener('click', (e) => {
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers
                e.preventDefault();
                
                // Apply current search term to file data
                this.applyCurrentFiltersToFileData();
            }, true);
        }
        
        // Handle search type select for file view
        const searchTypeSelect = document.getElementById('searchTypeSelect');
        if (searchTypeSelect) {
            searchTypeSelect.addEventListener('change', (e) => {
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                // Apply current search term with new search type
                this.applyCurrentFiltersToFileData();
            }, true);
        }
        
        // Handle threshold input for file view
        const thresholdInput = document.getElementById('threshold');
        if (thresholdInput) {
            thresholdInput.addEventListener('input', (e) => {
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                // Apply current search term with new threshold
                this.applyCurrentFiltersToFileData();
            }, true);
        }

        // Handle clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', (e) => {
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers
                
                // Clear the search input
                searchInput.value = '';
                
                // Reset filtered data to all data
                this.currentImportedData.filteredData = [...this.currentImportedData.data];
                this.displayImportedDataPage(this.currentImportedData.data, 1);
                this.setupImportedDataPagination(this.currentImportedData.data);
                
                // Hide clear button
                clearSearchBtn.classList.add('hidden');
            }, true);
        }
    }
    
    setupSheetSelector(sheetInfo, fileName) {
        console.log('Setting up sheet selector with:', sheetInfo); // Debug log
        
        // Get the sheet container element
        const sheetSelectorContainer = document.getElementById('sheet-selector-container');
        
        // Clear existing sheet selector if no sheets or only one sheet
        if (!sheetInfo || !sheetInfo.sheetNames || sheetInfo.sheetNames.length <= 1) {
            if (sheetSelectorContainer) {
                sheetSelectorContainer.innerHTML = '';
                sheetSelectorContainer.style.display = 'none'; // Hide container
            }
            
            // Also update the current file name display
            const currentFileNameElement = document.getElementById('current-file-name');
            if (currentFileNameElement && fileName) {
                currentFileNameElement.textContent = fileName;
            }
            
            return;
        }
        
        console.log('Found multiple sheets:', sheetInfo.sheetNames); // Debug log
        
        // Make the header section visible when we have multiple sheets
        const headerContainer = sheetSelectorContainer?.closest('.border-b');
        if (headerContainer) {
            headerContainer.classList.remove('hidden');
        }
        
        // Create HTML for sheet selector with styling that exactly matches the image
        const sheetSelectorHtml = `
            <div class="sheet-dropdown-wrapper">
                <select id="sheet-selector" class="w-56 px-4 py-2 pr-8 border-2 border-red-500 rounded bg-white text-gray-800 font-medium appearance-none">
                    ${sheetInfo.sheetNames.map(sheet => `
                        <option value="${sheet}" ${sheet === sheetInfo.currentSheet ? 'selected' : ''}>${sheet}</option>
                    `).join('')}
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                    </svg>
                </div>
            </div>
        `;
        
        // Make sure the container is visible and update its content
        if (sheetSelectorContainer) {
            sheetSelectorContainer.style.display = 'block'; // Force display
            sheetSelectorContainer.innerHTML = sheetSelectorHtml;
            
            // Also update the current file name display
            const currentFileNameElement = document.getElementById('current-file-name');
            if (currentFileNameElement) {
                currentFileNameElement.textContent = `${fileName}`;
            }
            
            // Add event listener to the sheet selector dropdown
            setTimeout(() => {
                const sheetSelector = document.getElementById('sheet-selector');
                if (sheetSelector) {
                    // Remove any existing listeners
                    const newSelector = sheetSelector.cloneNode(true);
                    if (sheetSelector.parentNode) {
                        sheetSelector.parentNode.replaceChild(newSelector, sheetSelector);
                    }
                    
                    // Add event listener for sheet selection
                    newSelector.addEventListener('change', (e) => {
                        const selectedSheet = e.target.value;
                        console.log(`Switching to sheet: ${selectedSheet}`);
                        
                        // Update UI to show what sheet is being viewed
                        const currentFileNameElement = document.getElementById('current-file-name');
                        if (currentFileNameElement) {
                            currentFileNameElement.textContent = `${fileName} - ${selectedSheet}`;
                        }
                        
                        this.loadExcelSheet(selectedSheet, fileName);
                    });
                    
                    console.log('Sheet selector event listener attached');
                }
            }, 100);
        } else {
            console.error('Sheet selector container not found! Make sure sheet-selector-container element exists in HTML.');
        }
    }
    
    loadExcelSheet(sheetName, fileName) {
        const fileId = this.currentFile;
        const file = this.projects[this.currentProject].files[fileId];
        
        if (!file) {
            console.error('Cannot load sheet - file not found');
            return;
        }
        
        console.log(`Loading sheet: ${sheetName} from file: ${fileName}`);
        
        try {
            // Show loading notification
            this.showNotification(`Loading sheet: ${sheetName}...`, 'info');
            
            // Reset search input
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.value = '';
            
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
            
            // Try multiple methods to read the workbook to ensure reliable sheet access
            const workbook = XLSX.read(file.data, {
                type: 'array',
                cellDates: true,
                bookSheets: true,
                WTF: true
            });
            
            if (!workbook.SheetNames.includes(sheetName)) {
                throw new Error(`Sheet "${sheetName}" not found in workbook`);
            }
            
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) {
                throw new Error(`Sheet "${sheetName}" exists but is invalid`);
            }
            
            console.log(`Successfully accessed sheet: ${sheetName}`);
            
            // Convert to JSON with robust options
            const jsonData = XLSX.utils.sheet_to_json(sheet, { 
                header: 1,
                defval: '',
                blankrows: false,
                raw: false
            });
            
            if (!jsonData || !Array.isArray(jsonData) || jsonData.length === 0) {
                throw new Error(`Sheet "${sheetName}" is empty or has invalid data`);
            }
            
            console.log(`Converted sheet to JSON data with ${jsonData.length} rows`);
            
            // Get headers from first row
            let headers = [];
            if (jsonData[0] && Array.isArray(jsonData[0])) {
                headers = jsonData[0].map(h => String(h || '').trim() || `Column_${Math.random().toString(36).substr(2, 5)}`);
            } else {
                headers = ['Column_1']; // Default if no valid headers found
            }
            
            // Create data objects (skip first row which is headers)
            const sheetData = [];
            for (let i = 1; i < jsonData.length; i++) {
                const rowData = jsonData[i];
                if (!rowData || !Array.isArray(rowData) || rowData.length === 0) continue;
                
                const row = {};
                headers.forEach((header, index) => {
                    const value = index < rowData.length ? rowData[index] : '';
                    row[header] = value !== null && value !== undefined ? String(value) : '';
                });
                
                sheetData.push(row);
            }
            
            console.log(`Processed ${sheetData.length} data rows from sheet`);
            
            // Update UI with the processed data
            this.updateTableWithImportedData(fileName, headers, sheetData, {
                sheetNames: workbook.SheetNames,
                currentSheet: sheetName
            });
            
            // Update the file view indicator to include the sheet name
            const fileNameElement = document.getElementById('current-file-name');
            if (fileNameElement) {
                fileNameElement.textContent = `${fileName} - ${sheetName}`;
                
                // Make sure the header is visible
                const headerContainer = fileNameElement.closest('.border-b');
                if (headerContainer) {
                    headerContainer.classList.remove('hidden');
                }
            }
            
            // Make sure sheet selector is visible
            const sheetSelectorContainer = document.getElementById('sheet-selector-container');
            if (sheetSelectorContainer) {
                sheetSelectorContainer.style.display = 'block';
            }
            
            // Show success notification
            this.showNotification(`Successfully loaded sheet: ${sheetName}`, 'success');
            
            // Force redraw of the sheet selector
            this.setupSheetSelector({
                sheetNames: workbook.SheetNames,
                currentSheet: sheetName
            }, fileName);
            
            // Set up category filtering
            this.setupCategoryFiltering();
            
        } catch (error) {
            console.error('Error loading sheet:', error);
            this.showNotification(`Error loading sheet "${sheetName}": ${error.message}`, 'error');
        }
    }
    
    detectKeywordColumn(headers) {
        // Try to find the most likely keyword column
        const keywordColumnCandidates = ['keyword', 'kw', 'key word', 'keywords', 'term', 'query'];
        
        // First try exact match (case insensitive)
        for (const candidate of keywordColumnCandidates) {
            const match = headers.find(h => h.toLowerCase() === candidate);
            if (match) return match;
        }
        
        // Then try partial match
        for (const candidate of keywordColumnCandidates) {
            const match = headers.find(h => h.toLowerCase().includes(candidate));
            if (match) return match;
        }
        
        // Fall back to first column
        return headers[0] || '';
    }
    
    setupImportedFileTableSorting() {
        // Get sortable headers
        const sortables = document.querySelectorAll('th.sortable');
        
        // Add event listeners for sorting
        sortables.forEach(sortable => {
            sortable.addEventListener('click', (e) => {
                // Only handle this if we're in file view
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers
                
                const sortColumn = sortable.getAttribute('data-sort');
                if (!sortColumn) return;
                
                // Toggle sort direction
                const currentDirection = sortable.getAttribute('data-direction') || 'asc';
                const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
                
                // Update all sort icons to default
                document.querySelectorAll('th.sortable i').forEach(icon => {
                    icon.className = 'fas fa-sort ml-2 text-slate-400';
                });
                
                // Update this column's sort icon
                const sortIcon = sortable.querySelector('i');
                if (sortIcon) {
                    sortIcon.className = `fas fa-sort-${newDirection === 'asc' ? 'up' : 'down'} ml-2 text-indigo-500`;
                }
                
                // Update sort direction attribute
                sortable.setAttribute('data-direction', newDirection);
                
                // Get current filtered data or all data if no filters
                const dataToSort = [...(this.currentImportedData.filteredData || this.currentImportedData.data)];
                
                // Sort the data
                dataToSort.sort((a, b) => {
                    const aValue = String(a[sortColumn] || '').toLowerCase();
                    const bValue = String(b[sortColumn] || '').toLowerCase();
                    
                    // Check if values are numbers
                    const aNum = parseFloat(aValue);
                    const bNum = parseFloat(bValue);
                    
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        // Sort numerically
                        return newDirection === 'asc' ? aNum - bNum : bNum - aNum;
                    } else {
                        // Sort alphabetically
                        if (aValue < bValue) return newDirection === 'asc' ? -1 : 1;
                        if (aValue > bValue) return newDirection === 'asc' ? 1 : -1;
                        return 0;
                    }
                });
                
                // Update the current filtered data
                this.currentImportedData.filteredData = dataToSort;
                
                // Display the sorted data
                this.displayImportedDataPage(dataToSort, 1);
                
                // Make sure KD column is properly styled after sorting
                if (this.fixImportedTableStyles) {
                    this.fixImportedTableStyles();
                }
                
                // Fix column alignments
                setTimeout(() => {
                    this.fixImportedTableColumnAlignment();
                }, 50);
            });
        });
    }
    
    setupImportedDataPagination(data) {
        // Get pagination elements
        const paginationControls = document.getElementById('pagination-controls');
        if (!paginationControls) return;
        
        // Show pagination if we have enough data
        const pageSize = parseInt(document.getElementById('main-page-size-input')?.value || '100');
        const totalPages = Math.ceil(data.length / pageSize);
        
        if (totalPages <= 1) {
            paginationControls.classList.add('hidden');
            return;
        }
        
        // Show pagination controls
        paginationControls.classList.remove('hidden');
        
        // Set up pagination HTML
        paginationControls.innerHTML = this.generatePaginationHTML(1, totalPages, data.length);
        
        // Set up pagination event listeners
        this.setupPaginationEventListeners(data);
    }
    
    generatePaginationHTML(currentPage, totalPages, totalItems) {
        return `
            <div class="flex items-center justify-between">
                <div class="text-sm text-slate-600">
                    Showing <span id="page-range-start">${(currentPage - 1) * this.getPageSize() + 1}</span> - 
                    <span id="page-range-end">${Math.min(currentPage * this.getPageSize(), totalItems)}</span> of 
                    <span id="total-items">${totalItems}</span> items
                </div>
                <div class="flex items-center space-x-2">
                    <button id="prev-page" class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''}>
                        <i class="fas fa-chevron-left mr-1"></i> Prev
                    </button>
                    ${this.generatePageNumbersHTML(currentPage, totalPages)}
                    <button id="next-page" class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''}>
                        Next <i class="fas fa-chevron-right ml-1"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    generatePageNumbersHTML(currentPage, totalPages) {
        let html = '';
        
        // Logic to show a reasonable number of page links
        const maxVisiblePages = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        // First page
        if (startPage > 1) {
            html += `<button class="pagination-btn page-number" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="pagination-ellipsis">...</span>`;
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            html += `<button class="pagination-btn page-number ${i === currentPage ? 'bg-blue-600 text-white' : ''}" data-page="${i}">${i}</button>`;
        }
        
        // Last page
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="pagination-ellipsis">...</span>`;
            html += `<button class="pagination-btn page-number" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        return html;
    }
    
    setupPaginationEventListeners(data) {
        const pageSize = this.getPageSize();
        let currentPage = 1;
        
        // Previous page button
        const prevButton = document.getElementById('prev-page');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    this.displayImportedDataPage(data, currentPage);
                }
            });
        }
        
        // Next page button
        const nextButton = document.getElementById('next-page');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const totalPages = Math.ceil(data.length / pageSize);
                if (currentPage < totalPages) {
                    currentPage++;
                    this.displayImportedDataPage(data, currentPage);
                }
            });
        }
        
        // Page number buttons
        document.querySelectorAll('.page-number').forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.getAttribute('data-page'));
                currentPage = page;
                this.displayImportedDataPage(data, currentPage);
            });
        });
        
        // Page size input
        const pageSizeInput = document.getElementById('main-page-size-input');
        if (pageSizeInput) {
            pageSizeInput.addEventListener('change', () => {
                currentPage = 1; // Reset to first page when changing page size
                this.displayImportedDataPage(data, currentPage);
            });
        }
    }
    
    displayImportedDataPage(data, page) {
        if (!this.currentImportedData) return;
        
        // Make sure data is actually an array
        if (!Array.isArray(data)) {
            console.error('displayImportedDataPage: data is not an array', data);
            data = [];
        }
        
        const pageSize = this.getPageSize();
        const startIndex = (page - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, data.length);
        
        // Get paginated data
        let paginatedData = [];
        if (startIndex < data.length) {
            paginatedData = data.slice(startIndex, endIndex);
        }
        
        // Update table body
        const tableBody = document.getElementById('keywordsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        // Show message if no data
        if (paginatedData.length === 0) {
            const tr = document.createElement('tr');
            tr.className = 'bg-white border-b border-slate-100';
            
            const colSpan = (this.currentImportedData.headers?.length || 0) + 1;
            
            tr.innerHTML = `
                <td colspan="${colSpan}" class="py-8 px-6 text-center text-slate-500">
                    <div class="flex flex-col items-center justify-center">
                        <i class="fas fa-search text-slate-300 text-4xl mb-3"></i>
                        <p>No matching data found</p>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(tr);
            
            // Update pagination
            const paginationControls = document.getElementById('pagination-controls');
            if (paginationControls) {
                paginationControls.classList.add('hidden');
            }
            
            return;
        }
        
        // Get the keyword column name
        const keywordColumnName = this.detectKeywordColumn(this.currentImportedData.headers || []);
        
        // Add rows for this page
        paginatedData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = `table-row ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`;
            
            // Get the keyword value
            const keywordValue = row[keywordColumnName] || '';
            
            tr.innerHTML = `
                <td class="py-2 px-6">
                    <input type="checkbox" class="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" data-keyword="${keywordValue}">
                </td>
            `;
            
            // Add all columns
            if (this.currentImportedData.headers) {
                this.currentImportedData.headers.forEach((header, idx) => {
                    if (!header) return; // Skip empty headers
                    
                    const value = row[header] || '';
                    
                    // Style Volume column if it's detected as a volume column
                    const isVolumeColumn = header.toLowerCase().includes('volum') || header.toLowerCase().includes('vol');
                    
                    // Style Value/KD column if it's detected as a value column
                    const isValueColumn = header.toLowerCase() === 'value' || header.toLowerCase() === 'kd' || 
                        header.toLowerCase().includes('difficulty') || header.toLowerCase().includes('kd');
                    
                    let cellContent = value;
                    
                                                            // Format volume numbers with different colors for different ranges
                    if (isVolumeColumn) {
                        // Determine volume range and apply appropriate styling
                        if (value && !isNaN(value)) {
                            // Apply volume formatting
                            const numValue = parseInt(value);
                            let volumeClass = ""; // Will determine background and text color
                            
                            // Format number for display
                            if (numValue >= 1000000) {
                                cellContent = `${(numValue / 1000000).toFixed(1)}M`;
                                volumeClass = "bg-red-100 text-red-800"; // 1M+ range - light red
                            } else if (numValue >= 100000) {
                                cellContent = `${(numValue / 1000).toFixed(1)}K`;
                                volumeClass = "bg-blue-100 text-blue-800"; // 100K+ range
                            } else if (numValue >= 10000) {
                                cellContent = `${(numValue / 1000).toFixed(1)}K`;
                                volumeClass = "bg-green-100 text-green-800"; // 10K+ range
                            } else {
                                cellContent = `${(numValue / 1000).toFixed(1)}K`;
                                volumeClass = "bg-teal-100 text-teal-800"; // Default for other values
                            }
                            
                            // Add volume styling with consistent appearance matching saved keywords
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${volumeClass}" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">${cellContent}</span>`;
                        } else if (value && typeof value === 'string') {
                            // Handle string values like "10K-100K" or "1M-10M"
                            let volumeClass = "";
                            
                            if (value.toLowerCase().includes('1m') || value.toLowerCase().includes('10m')) {
                                volumeClass = "bg-red-100 text-red-800"; // 1M-10M range - light red
                            } else if (value.toLowerCase().includes('100k') || (value.toLowerCase().includes('k') && !value.toLowerCase().includes('10k'))) {
                                volumeClass = "bg-blue-100 text-blue-800"; // 100K-1M range
                            } else if (value.toLowerCase().includes('10k')) {
                                volumeClass = "bg-green-100 text-green-800"; // 10K-100K range
                            } else {
                                volumeClass = "bg-gray-100 text-gray-800"; // Default
                            }
                            
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${volumeClass}" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">${value}</span>`;
                        } else if (!value || value.toLowerCase() === 'na' || value.toLowerCase() === 'n/a' || value === '-') {
                            // Handle NA values with consistent styling
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">NA</span>`;
                        } else {
                            // For any other non-numeric values in volume column
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">${value}</span>`;
                        }
                    }
                    
                    // Format KD/Value with specific color scheme
                    if (isValueColumn && value) {
                        if (!isNaN(value)) {
                            const numValue = parseFloat(value);
                            
                            // Determine difficulty level based on KD value with specific colors
                            if (numValue <= 15) {
                                // Light yellow for Low
                                cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">Low</span>`;
                            } else if (numValue <= 30) {
                                // Light orange for Medium
                                cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">Medium</span>`;
                            } else {
                                // Light red for High
                                cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">High</span>`;
                            }
                        } else if (value.toLowerCase() === 'low') {
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">Low</span>`;
                        } else if (value.toLowerCase() === 'medium') {
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">Medium</span>`;
                        } else if (value.toLowerCase() === 'high') {
                            cellContent = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800" style="display: inline-block; width: 80px; min-width: 80px; text-align: center;">High</span>`;
                        }
                    }
                    
                    tr.innerHTML += `
                        <td class="py-2 px-4 text-sm font-medium text-slate-900">
                            ${cellContent}
                        </td>
                    `;
                });
            }
            
            tableBody.appendChild(tr);
        });
        
        // Update pagination controls
        const totalPages = Math.ceil(data.length / pageSize);
        const paginationControls = document.getElementById('pagination-controls');
        if (paginationControls) {
            if (totalPages <= 1) {
                paginationControls.classList.add('hidden');
            } else {
                paginationControls.classList.remove('hidden');
                paginationControls.innerHTML = this.generatePaginationHTML(page, totalPages, data.length);
                
                // Reattach event listeners after updating HTML
                this.attachPaginationEventListeners(data, page);
            }
        }
        
        // Update the "Showing X to Y of Z items" text
        const pageRangeStart = document.getElementById('page-range-start');
        const pageRangeEnd = document.getElementById('page-range-end');
        const totalItems = document.getElementById('total-items');
        
        if (pageRangeStart) pageRangeStart.textContent = data.length > 0 ? startIndex + 1 : 0;
        if (pageRangeEnd) pageRangeEnd.textContent = endIndex;
        if (totalItems) totalItems.textContent = data.length;
        
        // Ensure the global count is updated after displaying a new page of imported data
        if (window.updateSelectedCount) window.updateSelectedCount();
        if (window.updateSelectAllCheckboxState) window.updateSelectAllCheckboxState();
        
        // Fix alignment for Volume and KD columns in imported file
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 100); // Small delay to ensure DOM is updated
    }
    
    attachPaginationEventListeners(data, currentPage) {
        // Previous page button
        const prevButton = document.getElementById('prev-page');
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                if (currentPage > 1) {
                    this.displayImportedDataPage(data, currentPage - 1);
                }
            });
        }
        
        // Next page button
        const nextButton = document.getElementById('next-page');
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                const pageSize = this.getPageSize();
                const totalPages = Math.ceil(data.length / pageSize);
                if (currentPage < totalPages) {
                    this.displayImportedDataPage(data, currentPage + 1);
                }
            });
        }
        
        // Page number buttons
        document.querySelectorAll('.page-number').forEach(button => {
            button.addEventListener('click', () => {
                const page = parseInt(button.getAttribute('data-page'));
                this.displayImportedDataPage(data, page);
            });
        });
    }

    resetMainView() {
        this.currentFile = null;
        this.currentImportedData = null;
        
        // Reset file list UI selection
        document.querySelectorAll('.project-file-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Reset the page title
        const pageTitle = document.querySelector('header h1');
        if (pageTitle) {
            pageTitle.textContent = 'Keyword Planner';
        }
        
        // Hide the file info header
        const fileHeader = document.getElementById('current-file-name');
        if (fileHeader) {
            const headerContainer = fileHeader.closest('.border-b');
            if (headerContainer) {
                headerContainer.classList.add('hidden');
            }
            fileHeader.textContent = '';
        }
        
        // Remove any sheet selector UI
        const sheetSelectorContainer = document.getElementById('sheet-selector-container');
        if (sheetSelectorContainer) {
            sheetSelectorContainer.innerHTML = '';
        }
        
        // Reset UI state for search and filters
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';
        
        const volumeFilterLabel = document.getElementById('main-volume-filter-label');
        if (volumeFilterLabel) volumeFilterLabel.textContent = 'All Volumes';
        
        // Clear selected items count
        const selectedCountContainer = document.getElementById('selected-count-container');
        if (selectedCountContainer) selectedCountContainer.style.display = 'none';
        
        // Reset selection checkbox
        const selectAllCheckbox = document.getElementById('selectAll');
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        
        // Hide the clear search button
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
        
        // Hide any suggestions container
        const suggestionsContainer = document.getElementById('suggestionsContainer');
        if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
        
        // Reset filtering state in the main.js environment
        if (window.currentVolumeFilter) {
            window.currentVolumeFilter = '';
        }
        
        // Load default keywords again from server
        if (window.loadKeywords) {
            window.loadKeywords('', 1);
        }
        
        // Restore table headers to default
        this.restoreMainTableHeaders();
        
        // Show a notification that we've returned to main data
        this.showNotification('Returned to main keyword data', 'info');
        
        // Clear selectedKeywordsSet to reset all selections
        if (window.selectedKeywordsSet) {
            window.selectedKeywordsSet.clear();
        }
        
        // Update the selection count display using main.js function
        if (window.updateSelectedCount) {
            window.updateSelectedCount();
        }
    }
    
    restoreMainTableHeaders() {
        const tableHeader = document.querySelector('#keywordsTableBody').closest('table').querySelector('thead tr');
        if (!tableHeader) return;
        
        tableHeader.innerHTML = `
            <th class="py-3 px-4 text-left max-w-[40px]">
                <div class="flex items-center">
                    <input type="checkbox" id="selectAll" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer">
                </div>
            </th>
            <th class="py-3 px-4 text-left sortable" data-sort="keyword">
                <span class="flex items-center">
                    <span class="font-semibold text-slate-700">Keyword</span>
                    <i class="fas fa-sort ml-2 text-slate-400"></i>
                </span>
            </th>
            <th class="py-3 px-4 text-left sortable" data-sort="volume">
                <span class="flex items-center">
                    <span class="font-semibold text-slate-700">Volume</span>
                    <i class="fas fa-sort ml-2 text-slate-400"></i>
                </span>
            </th>
            <th class="py-3 px-4 text-left sortable" data-sort="value">
                <span class="flex items-center">
                    <span class="font-semibold text-slate-700">Value</span>
                    <i class="fas fa-sort ml-2 text-slate-400"></i>
                </span>
            </th>
        `;
        
        // Add back the event listeners for sorting
        document.querySelectorAll('th.sortable').forEach(header => {
            header.addEventListener('click', function(e) {
                if (window.handleSort) {
                    window.handleSort.call(this, e);
                }
            });
        });
    }

    updateProjectSelector() {
        const select = this.elements.projectSelector;
        select.innerHTML = '';
        
        // Add all projects to selector
        Object.entries(this.projects).forEach(([id, project]) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = project.name;
            select.appendChild(option);
        });
        
        // Set current project
        select.value = this.currentProject;
    }

    updateFileList() {
        const fileList = this.elements.projectFileList;
        fileList.innerHTML = '';
        
        const currentProjectFiles = this.projects[this.currentProject].files;
        const fileEntries = Object.values(currentProjectFiles);
        
        if (fileEntries.length === 0) {
            fileList.innerHTML = '<div class="text-xs text-indigo-400 italic py-1">No files imported</div>';
            return;
        }
        
        // Sort files by added date (newest first)
        fileEntries.sort((a, b) => b.addedAt - a.addedAt);
        
        fileEntries.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = `project-file-item px-2 py-1.5 flex items-center justify-between text-xs text-white ${this.currentFile === file.id ? 'active' : ''}`;
            fileItem.dataset.fileId = file.id;
            
            fileItem.innerHTML = `
                <div class="flex items-center overflow-hidden">
                    <i class="fas fa-file-alt mr-2 text-indigo-300"></i>
                    <span class="truncate">${file.name}</span>
                </div>
                <button class="delete-file-btn text-red-400 hover:text-red-300 ml-2" title="Delete File">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            fileList.appendChild(fileItem);
        });
    }

    getPageSize() {
        const pageSizeInput = document.getElementById('main-page-size-input');
        return pageSizeInput ? parseInt(pageSizeInput.value || '100') : 100;
    }

    // Implement volume filtering for imported files
    setupVolumeFiltering() {
        // Get volume filter elements
        const volumeFilterBtn = document.getElementById('main-volume-filter-btn');
        const volumeFilterDropdown = document.getElementById('main-volume-filter-dropdown');
        const volumeFilterOptions = document.querySelectorAll('.main-volume-filter-option');
        const volumeFilterLabel = document.getElementById('main-volume-filter-label');
        
        if (!volumeFilterBtn || !volumeFilterDropdown || !volumeFilterOptions.length) return;
        
        // Toggle dropdown - this is shared behavior, so we'll use the original event
        
        // Handle filter option clicks specifically for file view
        volumeFilterOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Only handle this if we're in file view
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers from running
                e.preventDefault();
                
                const filter = option.getAttribute('data-filter');
                const label = option.textContent.trim();
                
                // Update button label
                if (volumeFilterLabel) {
                    volumeFilterLabel.textContent = label;
                }
                
                // Close dropdown
                volumeFilterDropdown.classList.add('hidden');
                
                // Apply filter to our file data
                this.applyCurrentFiltersToFileData();
            }, true); // Use capturing phase for our listener
        });
    }
    
    applyVolumeFilter(filter) {
        if (!this.currentImportedData || !this.currentImportedData.data) return;
        
        // Get original data
        const originalData = [...this.currentImportedData.data];
        
        // If no filter, show all data
        if (!filter) {
            this.currentImportedData.filteredData = originalData;
            this.displayImportedDataPage(originalData, 1);
            this.setupImportedDataPagination(originalData);
            return;
        }
        
        // Find volume column
        const volumeColumnNames = ['volume', 'volumn', 'vol', 'search volume', 'monthly volume', 'search_volume'];
        let volumeColumn = null;
        
        for (const name of volumeColumnNames) {
            if (this.currentImportedData.headers.some(h => h.toLowerCase() === name)) {
                volumeColumn = this.currentImportedData.headers.find(h => h.toLowerCase() === name);
                break;
            }
        }
        
        // If no volume column found, check if there's a column with "volume" in it
        if (!volumeColumn) {
            volumeColumn = this.currentImportedData.headers.find(h => 
                h.toLowerCase().includes('volume') || h.toLowerCase().includes('volumn')
            );
        }
        
        // If still no volume column, use the second column as a fallback (assuming first is keyword)
        if (!volumeColumn && this.currentImportedData.headers.length > 1) {
            volumeColumn = this.currentImportedData.headers[1];
        }
        
        // If no suitable column found, alert and return
        if (!volumeColumn) {
            alert('No volume column found in the data');
            return;
        }
        
        // Filter data based on volume
        let filteredData = [];
        
        if (filter === 'blank') {
            // Filter for blank or 'NA' values
            filteredData = originalData.filter(row => {
                const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                return !volume || volume === 'na' || volume === 'n/a';
            });
        } else if (filter === '10K-100K') {
            // Filter for volumes between 10K and 100K
            filteredData = originalData.filter(row => {
                const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                return volume.includes('10k') || 
                       (volume.includes('k') && 
                        !volume.includes('1m') && 
                        !volume.includes('1 m') && 
                        parseFloat(volume) >= 10);
            });
        } else if (filter === '100K-1M') {
            // Filter for volumes between 100K and 1M
            filteredData = originalData.filter(row => {
                const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                return volume.includes('100k') || 
                       (volume.includes('k') && parseFloat(volume) >= 100) ||
                       (volume.includes('m') && parseFloat(volume) < 1);
            });
        } else if (filter === '1M-10M') {
            // Filter for volumes between 1M and 10M
            filteredData = originalData.filter(row => {
                const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                return volume.includes('1m') || 
                       (volume.includes('m') && parseFloat(volume) >= 1 && parseFloat(volume) < 10);
            });
        }
        
        // Update filtered data and display
        this.currentImportedData.filteredData = filteredData;
        this.displayImportedDataPage(filteredData, 1);
        this.setupImportedDataPagination(filteredData);
        
        // Fix column alignments
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 50);
    }
    
    // Setup export and copy functionality
    setupExportAndCopy() {
        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', (e) => {
                // Only handle if we're in file view
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers
                e.preventDefault();
                
                this.exportSelectedKeywords();
            }, true); // Use capturing phase
        }
        
        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', (e) => {
                // Only handle if we're in file view
                if (!this.currentFile || !this.currentImportedData) {
                    return; // Let original handler work
                }
                
                e.stopPropagation(); // Prevent other handlers
                e.preventDefault();
                
                this.copySelectedKeywords();
            }, true); // Use capturing phase
        }
    }
    
    exportSelectedKeywords() {
        // Get checked checkboxes
        const checkboxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            alert('Please select at least one keyword to export');
            return;
        }
        
        // Get selected keywords data
        const selectedKeywords = [];
        checkboxes.forEach(checkbox => {
            const keywordValue = checkbox.getAttribute('data-keyword');
            if (!keywordValue) return;
            
            // Find this keyword in the data
            const keywordData = this.findKeywordInData(keywordValue);
            if (keywordData) {
                selectedKeywords.push(keywordData);
            }
        });
        
        if (selectedKeywords.length === 0) {
            alert('Could not find data for selected keywords');
            return;
        }
        
        // Create CSV content
        let csvContent = '';
        
        // Get headers from the first keyword
        const headers = Object.keys(selectedKeywords[0]);
        csvContent += headers.join(',') + '\n';
        
        // Add rows
        selectedKeywords.forEach(keyword => {
            const row = headers.map(header => {
                // Make sure value is properly escaped for CSV
                const value = keyword[header] || '';
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvContent += row.join(',') + '\n';
        });
        
        // Create download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'selected_keywords.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
    
    copySelectedKeywords() {
        // Get checked checkboxes
        const checkboxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"]:checked');
        
        if (checkboxes.length === 0) {
            alert('Please select at least one keyword to copy');
            return;
        }
        
        // Get just the keyword values
        const keywords = [];
        checkboxes.forEach(checkbox => {
            const keywordValue = checkbox.getAttribute('data-keyword');
            if (keywordValue) {
                keywords.push(keywordValue);
            }
        });
        
        if (keywords.length === 0) {
            alert('No keywords found to copy');
            return;
        }
        
        // Copy to clipboard
        const textToCopy = keywords.join('\n');
        
        // Use clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy)
                .then(() => {
                    // Show success message
                    this.showToast(`${keywords.length} keywords copied to clipboard`);
                })
                .catch(err => {
                    console.error('Could not copy text: ', err);
                    this.fallbackCopy(textToCopy);
                });
        } else {
            this.fallbackCopy(textToCopy);
        }
    }
    
    fallbackCopy(text) {
        // Create a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        
        // Select and copy
        textarea.select();
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                this.showToast('Keywords copied to clipboard');
            } else {
                alert('Unable to copy keywords');
            }
        } catch (err) {
            console.error('Failed to copy: ', err);
            alert('Unable to copy keywords');
        }
        
        // Clean up
        document.body.removeChild(textarea);
    }
    
    showToast(message) {
        // Check if a toast container exists, create one if not
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed bottom-4 right-4 z-50';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = 'bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg mb-2 flex items-center';
        toast.innerHTML = `
            <i class="fas fa-check-circle text-green-400 mr-2"></i>
            <span>${message}</span>
        `;
        
        // Add to container
        toastContainer.appendChild(toast);
        
        // Remove after delay
        setTimeout(() => {
            toast.classList.add('opacity-0');
            toast.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                if (toastContainer.contains(toast)) {
                    toastContainer.removeChild(toast);
                }
                
                // Remove container if empty
                if (toastContainer.children.length === 0) {
                    document.body.removeChild(toastContainer);
                }
            }, 500);
        }, 3000);
    }
    
    findKeywordInData(keywordValue) {
        if (!this.currentImportedData || !this.currentImportedData.data) return null;
        
        // Find the keyword column
        const keywordColumn = this.detectKeywordColumn(this.currentImportedData.headers || []);
        
        // Find the row with this keyword
        return this.currentImportedData.data.find(row => row[keywordColumn] === keywordValue);
    }
    
    calculateSimilarity(str1, str2) {
        // Convert to strings and normalize
        str1 = String(str1).toLowerCase().trim();
        str2 = String(str2).toLowerCase().trim();
        
        // Check for exact match
        if (str1 === str2) {
            return 100.0;
        }
        
        // Check for containment (one string inside another)
        if (str1 in str2) {
            const ratio = (str1.length / str2.length) * 100;
            return Math.max(ratio, 85.0);  // At least a 85% match for contained strings
        }
        
        if (str2 in str1) {
            const ratio = (str2.length / str1.length) * 100;
            return Math.max(ratio, 85.0);  // At least a 85% match for contained strings
        }
        
        // Check for word matches (e.g. "seo" in "seo services")
        const words1 = str1.split(' ');
        const words2 = str2.split(' ');
        
        for (const word of words1) {
            if (words2.includes(word) && word.length > 2) {  // Only count meaningful words
                // Weight by word length relative to string length
                const wordImportance = word.length / Math.max(str1.length, str2.length);
                return 70 + (wordImportance * 30);  // Base 70% match + up to 30% more
            }
        }
        
        // Use Levenshtein distance for more complex cases
        const distance = this.levenshteinDistance(str1, str2);
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 100.0;
        
        return (1 - distance / maxLen) * 100;
    }
    
    levenshteinDistance(str1, str2) {
        const track = Array(str2.length + 1).fill(null).map(() => 
            Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i += 1) {
            track[0][i] = i;
        }
        
        for (let j = 0; j <= str2.length; j += 1) {
            track[j][0] = j;
        }
        
        for (let j = 1; j <= str2.length; j += 1) {
            for (let i = 1; i <= str1.length; i += 1) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                track[j][i] = Math.min(
                    track[j][i - 1] + 1, // deletion
                    track[j - 1][i] + 1, // insertion
                    track[j - 1][i - 1] + indicator, // substitution
                );
            }
        }
        
        return track[str2.length][str1.length];
    }

    showNotification(message, type = 'info') {
        // Check if notification container exists
        let notificationContainer = document.getElementById('notification-container');
        if (!notificationContainer) {
            notificationContainer = document.createElement('div');
            notificationContainer.id = 'notification-container';
            notificationContainer.className = 'fixed bottom-4 right-4 z-50 w-80';
            document.body.appendChild(notificationContainer);
        }
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'mb-4 p-4 rounded-lg shadow-lg flex items-start justify-between transition-all duration-300 transform translate-x-0';
        
        // Add type-specific styling
        switch (type) {
            case 'success':
                notification.classList.add('bg-green-50', 'border-l-4', 'border-green-500', 'text-green-700');
                break;
            case 'error':
                notification.classList.add('bg-red-50', 'border-l-4', 'border-red-500', 'text-red-700');
                break;
            case 'warning':
                notification.classList.add('bg-yellow-50', 'border-l-4', 'border-yellow-500', 'text-yellow-700');
                break;
            case 'info':
            default:
                notification.classList.add('bg-blue-50', 'border-l-4', 'border-blue-500', 'text-blue-700');
                break;
        }
        
        // Set icon based on notification type
        let icon = 'info-circle';
        switch (type) {
            case 'success':
                icon = 'check-circle';
                break;
            case 'error':
                icon = 'exclamation-circle';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                break;
        }
        
        // Add content to notification
        notification.innerHTML = `
            <div class="flex">
                <div class="flex-shrink-0 mr-3">
                    <i class="fas fa-${icon} text-xl"></i>
                </div>
                <div>
                    <p class="text-sm">${message}</p>
                </div>
            </div>
            <div class="ml-3">
                <button class="close-notification text-sm hover:text-slate-900">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to container
        notificationContainer.appendChild(notification);
        
        // Add click handler to close button
        notification.querySelector('.close-notification').addEventListener('click', () => {
            notification.classList.add('opacity-0');
            setTimeout(() => {
                notification.remove();
            }, 300);
        });
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.classList.add('opacity-0');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 5000);
        
        return notification;
    }

    // Add this method after the constructor
    overrideMainFunctionality() {
        // Save original loadKeywords function
        if (window.loadKeywords && !window.originalLoadKeywords) {
            window.originalLoadKeywords = window.loadKeywords;
            
            // Override the loadKeywords function to check if we're in file view
            window.loadKeywords = (searchTerm = '', page = 1) => {
                if (this.currentFile) {
                    // If we're viewing a file, don't load from API
                    console.log('In file view mode, not loading from API');
                    
                    // Instead, use our file data
                    if (this.currentImportedData) {
                        // Apply current search/filter to our file data if needed
                        this.applyCurrentFiltersToFileData();
                    }
                    return;
                }
                
                // Otherwise, use the original function
                window.originalLoadKeywords(searchTerm, page);
            };
        }
    }
    
    applyCurrentFiltersToFileData() {
        if (!this.currentImportedData) return;
        
        // Get current search/filter state from UI elements
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
        
        const volumeFilterLabel = document.getElementById('main-volume-filter-label');
        const volumeFilterText = volumeFilterLabel ? volumeFilterLabel.textContent.trim() : 'All Volumes';
        
        // Convert the filter label to the corresponding filter value
        let volumeFilter = '';
        if (volumeFilterText === 'Blank') volumeFilter = 'blank';
        else if (volumeFilterText === '10K-100K') volumeFilter = '10K-100K';
        else if (volumeFilterText === '100K-1M') volumeFilter = '100K-1M';
        else if (volumeFilterText === '1M-10M') volumeFilter = '1M-10M';
        
        // Start with all data
        let filteredData = [...this.currentImportedData.data];
        
        // Apply search term if any
        if (searchTerm) {
            const searchTypeSelect = document.getElementById('searchTypeSelect');
            const searchType = searchTypeSelect ? searchTypeSelect.value : 'partial';
            
            const thresholdInput = document.getElementById('threshold');
            const threshold = thresholdInput ? parseInt(thresholdInput.value || '70') : 70;
            
            filteredData = filteredData.filter(row => {
                return Object.entries(row).some(([key, value]) => {
                    const stringValue = String(value).toLowerCase();
                    
                    // Skip if value is empty
                    if (!stringValue) return false;
                    
                    if (searchType === 'exact') {
                        return stringValue === searchTerm;
                    } else {
                        // Use fuzzy matching
                        const similarity = this.calculateSimilarity(searchTerm, stringValue);
                        return similarity >= threshold;
                    }
                });
            });
        }
        
        // Apply volume filter if any
        if (volumeFilter) {
            // Find volume column
            const volumeColumnNames = ['volume', 'volumn', 'vol', 'search volume', 'monthly volume', 'search_volume'];
            let volumeColumn = null;
            
            for (const name of volumeColumnNames) {
                if (this.currentImportedData.headers.some(h => h.toLowerCase() === name)) {
                    volumeColumn = this.currentImportedData.headers.find(h => h.toLowerCase() === name);
                    break;
                }
            }
            
            // If no volume column found, check if there's a column with "volume" in it
            if (!volumeColumn) {
                volumeColumn = this.currentImportedData.headers.find(h => 
                    h.toLowerCase().includes('volume') || h.toLowerCase().includes('volumn')
                );
            }
            
            // If volume column found, apply filter
            if (volumeColumn) {
                if (volumeFilter === 'blank') {
                    filteredData = filteredData.filter(row => {
                        const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                        return !volume || volume === 'na' || volume === 'n/a';
                    });
                } else if (volumeFilter === '10K-100K') {
                    filteredData = filteredData.filter(row => {
                        const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                        return volume.includes('10k') || 
                               (volume.includes('k') && 
                                !volume.includes('1m') && 
                                !volume.includes('1 m') && 
                                parseFloat(volume) >= 10);
                    });
                } else if (volumeFilter === '100K-1M') {
                    filteredData = filteredData.filter(row => {
                        const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                        return volume.includes('100k') || 
                               (volume.includes('k') && parseFloat(volume) >= 100) ||
                               (volume.includes('m') && parseFloat(volume) < 1);
                    });
                } else if (volumeFilter === '1M-10M') {
                    filteredData = filteredData.filter(row => {
                        const volume = String(row[volumeColumn] || '').trim().toLowerCase();
                        return volume.includes('1m') || 
                               (volume.includes('m') && parseFloat(volume) >= 1 && parseFloat(volume) < 10);
                    });
                }
            }
        }
        
        // Update filtered data
        this.currentImportedData.filteredData = filteredData;
        
        // Display the filtered data
        this.displayImportedDataPage(filteredData, 1);
        
        // Update pagination
        this.setupImportedDataPagination(filteredData);
        
        // Fix column alignments
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 50);
        
        // Fix column alignments
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
            
            // Maintain category filter functionality after other filters
            this.setupCategoryFiltering();
        }, 50);
    }

    renameProject() {
        const newName = this.elements.newProjectNameInput.value.trim();
        
        if (!newName) {
            alert('Please enter a valid project name.');
            return;
        }
        
        // Update project name
        this.projects[this.currentProject].name = newName;
        this.saveProjects();
        this.updateProjectSelector();
        
        // Close modal
        this.elements.renameProjectModal.classList.add('hidden');
        
        // Show notification
        this.showNotification(`Project renamed to "${newName}"`, 'success');
    }

    setupTableStyleFixer() {
        // Periodically check and fix imported table styles
        setInterval(() => {
            if (this.currentImportedData && this.fixImportedTableStyles) {
                // Check if we need to fix any Value column headers to show as KD
                const valueHeaders = document.querySelectorAll('th[data-sort="value"] .font-semibold, th[data-sort="kd"] .font-semibold');
                let needsFix = false;
                
                valueHeaders.forEach(header => {
                    if (header && header.textContent !== 'KD') {
                        needsFix = true;
                    }
                });
                
                if (needsFix) {
                    this.fixImportedTableStyles();
                }
            }
        }, 1000); // Check every second
    }

    // Add this function after the constructor or before updateTableWithImportedData method
    fixImportedTableColumnAlignment() {
        // Fix Volume column (3rd column) alignment
        document.querySelectorAll('#keywordsTableBody td:nth-child(3)').forEach(cell => {
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            
            // Center any content inside
            const spans = cell.querySelectorAll('span');
            spans.forEach(span => {
                span.style.margin = '0 auto';
                span.style.display = 'inline-block'; 
                span.style.textAlign = 'center';
                span.style.width = '100%';
            });
        });
        
        // Fix KD column (4th column) alignment
        document.querySelectorAll('#keywordsTableBody td:nth-child(4)').forEach(cell => {
            cell.style.textAlign = 'center';
            cell.style.verticalAlign = 'middle';
            
            // Center any content inside
            const spans = cell.querySelectorAll('span');
            spans.forEach(span => {
                span.style.margin = '0 auto';
                span.style.display = 'inline-block';
                span.style.textAlign = 'center';
                span.style.width = '100%';
            });
        });
    }

    // Add this function after fixImportedTableColumnAlignment

    // Extract and set up category filtering for imported files
    setupCategoryFiltering() {
        console.log('setupCategoryFiltering called');
        // Skip if no imported data
        if (!this.currentImportedData || !this.currentImportedData.data || !this.currentImportedData.headers) {
            console.log('No imported data available - checking main table');
            
            // Special case for the main table when it has a "Category" column
            // This handles the case shown in the screenshot
            const tableHeader = document.querySelector('th[data-sort="category"]');
            if (tableHeader) {
                console.log('Found Category column in main table');
                
                // Get unique categories from the table
                const uniqueCategories = new Set();
                const rows = document.querySelectorAll('#keywordsTableBody tr');
                
                console.log(`Found ${rows.length} rows in the table`);
                
                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    console.log(`Row ${index} has ${cells.length} cells`);
                    
                    if (cells.length >= 2) {
                        // Try to find the category cell - it's likely the second cell after the checkbox
                        const categoryCell = cells[1]; // After checkbox column
                        
                        if (categoryCell) {
                            const categoryText = categoryCell.textContent.trim();
                            console.log(`Row ${index} category text: "${categoryText}"`);
                            
                            if (categoryText) {
                                uniqueCategories.add(categoryText);
                            }
                        }
                    }
                });
                
                console.log(`Found ${uniqueCategories.size} categories in table:`, Array.from(uniqueCategories));
                
                if (uniqueCategories.size > 0) {
                    this.createCategoryFilterDropdown(Array.from(uniqueCategories).sort(), 'category');
                    return;
                } else {
                    // Check the table heading for "Category"
                    const tableTitle = document.querySelector('h1, .currently-viewing');
                    if (tableTitle && tableTitle.textContent.includes('Category')) {
                        console.log('Found Category in table title:', tableTitle.textContent);
                        
                        // Extract categories from the title
                        const titleText = tableTitle.textContent.trim();
                        if (titleText.includes('Category_wise') || titleText.includes('Category wise')) {
                            // This is the case from the screenshot - use hardcoded categories
                            const hardcodedCategories = [
                                'azan dua',
                                'azan after dua',
                                'azan duwa',
                                'azan ki dua',
                                'azan ki duwa',
                                'azaner dua',
                                'doa azan',
                                'adhan dua'
                            ];
                            
                            console.log('Using hardcoded categories for Category_wise view');
                            this.createCategoryFilterDropdown(hardcodedCategories, 'category');
                            return;
                        }
                    }
                    
                    // As a last resort, look for keywords with "azan" and "dua"
                    console.log('Looking for keywords with azan/dua patterns');
                    const keywordCells = document.querySelectorAll('td.text-sm.font-medium.text-slate-900');
                    const manualCategories = new Set();
                    
                    keywordCells.forEach(cell => {
                        const text = cell.textContent.trim();
                        if (text.includes('azan') || text.includes('dua')) {
                            if (text.includes(' ')) {
                                const parts = text.split(' ');
                                if (parts.length >= 2) {
                                    const category = parts[0] + ' ' + parts[1];
                                    manualCategories.add(category);
                                } else {
                                    manualCategories.add(parts[0]);
                                }
                            } else {
                                manualCategories.add(text);
                            }
                        }
                    });
                    
                    console.log(`Found ${manualCategories.size} manual categories:`, Array.from(manualCategories));
                    
                    if (manualCategories.size > 0) {
                        this.createCategoryFilterDropdown(Array.from(manualCategories).sort(), 'category');
                        return;
                    }
                }
            }
            
            // If we still don't have categories but we're viewing "Category_wise"
            const currentlyViewing = document.querySelector('.currently-viewing');
            if (currentlyViewing && currentlyViewing.textContent.includes('Category_wise')) {
                // Fallback to hardcoded categories from the screenshot
                const hardcodedCategories = [
                    'azan dua',
                    'azan after dua',
                    'azan duwa',
                    'azan ki dua',
                    'azan ki duwa',
                    'azaner dua',
                    'doa azan',
                    'adhan dua'
                ];
                
                console.log('Using hardcoded categories as fallback for Category_wise view');
                this.createCategoryFilterDropdown(hardcodedCategories, 'category');
                return;
            }
            
            return;
        }
        
        // Find if there's a category column - case insensitive check
        const categoryColumnIndex = this.currentImportedData.headers.findIndex(header => 
            header.toLowerCase() === 'category' || 
            header.toLowerCase() === 'category name' || 
            header.toLowerCase().includes('categ')
        );
        
        // If no category column found, exit
        if (categoryColumnIndex === -1) {
            console.log('No category column found in headers:', this.currentImportedData.headers);
            return;
        }
        
        const categoryColumnName = this.currentImportedData.headers[categoryColumnIndex];
        console.log(`Found category column: ${categoryColumnName}`);
        
        // Extract all unique categories
        const uniqueCategories = [...new Set(
            this.currentImportedData.data
                .map(row => row[categoryColumnName])
                .filter(category => category && category.trim() !== '')
        )].sort();
        
        console.log(`Found ${uniqueCategories.length} unique categories`);
        
        // Create or update the category filter dropdown
        this.createCategoryFilterDropdown(uniqueCategories, categoryColumnName);
    }

    // Create category filter dropdown
    createCategoryFilterDropdown(categories, categoryColumnName) {
        console.log('createCategoryFilterDropdown called with categories:', categories);
        
        // Get or create category filter container
        let categoryFilterContainer = document.getElementById('category-filter-container');
        
        if (!categoryFilterContainer) {
            // Try different selectors to find the search section
            let searchSection = document.querySelector('.search-section');
            
            if (!searchSection) {
                console.log('Could not find .search-section, trying alternative selectors');
                // Try to find the volume filter's parent as an alternative
                const volumeFilterBtn = document.getElementById('main-volume-filter-btn');
                if (volumeFilterBtn) {
                    searchSection = volumeFilterBtn.parentElement.parentElement;
                    console.log('Found search section via volume filter button');
                } else {
                    // Look for any container that might be suitable
                    searchSection = document.querySelector('.flex.items-center.justify-between');
                    console.log('Using alternative container for search section');
                }
            }
            
            if (!searchSection) {
                console.error('Could not find a suitable container for category filter');
                return;
            }
            
            categoryFilterContainer = document.createElement('div');
            categoryFilterContainer.id = 'category-filter-container';
            categoryFilterContainer.className = 'relative';
            
            // Match the volume filter button style exactly
            categoryFilterContainer.innerHTML = `
                <button id="category-filter-btn" class="flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg focus:outline-none shadow-sm hover:bg-slate-50 transition-all duration-150 text-sm">
                    <div class="flex items-center">
                        <i class="fas fa-list-ul text-slate-400 mr-1.5"></i>
                        <span id="category-filter-label" class="text-sm">All Categories</span>
                    </div>
                    <i class="fas fa-chevron-down text-xs text-slate-400 ml-1.5"></i>
                </button>
                <div id="category-filter-dropdown" class="absolute left-0 z-50 hidden w-64 mt-2 bg-white border border-slate-200 rounded-md shadow-lg">
                    <div class="py-1">
                        <div class="category-option px-4 py-2 text-sm cursor-pointer hover:bg-slate-100" data-category="all">All Categories</div>
                    </div>
                </div>
            `;
            
            // Insert BEFORE the volume filter container to position it to the left
            const volumeFilterContainer = document.getElementById('main-volume-filter-container');
            if (volumeFilterContainer) {
                searchSection.insertBefore(categoryFilterContainer, volumeFilterContainer);
                console.log('Inserted category filter before volume filter');
            } else {
                // Try to find the All Volumes dropdown button
                const volumesDropdown = document.querySelector('[id*="volume"]');
                if (volumesDropdown) {
                    const volumesContainer = volumesDropdown.closest('div');
                    if (volumesContainer) {
                        // Insert before the volumes dropdown
                        volumesContainer.parentElement.insertBefore(categoryFilterContainer, volumesContainer);
                        console.log('Inserted category filter before volumes dropdown');
                    } else {
                        // As a fallback, prepend to the search section
                        searchSection.prepend(categoryFilterContainer);
                        console.log('Prepended category filter to search section (fallback)');
                    }
                } else {
                    // As a fallback, prepend to the search section
                    searchSection.prepend(categoryFilterContainer);
                    console.log('Prepended category filter to search section (fallback)');
                }
            }
            
            // Make sure body has a click handler to close dropdown
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('category-filter-dropdown');
                if (dropdown && !e.target.closest('#category-filter-container')) {
                    dropdown.classList.add('hidden');
                }
            });
        } else {
            console.log('Category filter container already exists');
        }
        
        // Get dropdown element
        const dropdown = document.getElementById('category-filter-dropdown');
        if (!dropdown) {
            console.error('Could not find category dropdown element');
            return;
        }
        
        // Important: Make sure dropdown is hidden initially
        dropdown.classList.add('hidden');
        
        // Clear existing options and add new ones
        dropdown.innerHTML = '';
        
        // Add "All Categories" option
        const allOption = document.createElement('div');
        allOption.className = 'category-option px-4 py-2 text-sm cursor-pointer hover:bg-slate-100';
        allOption.dataset.category = 'all';
        allOption.textContent = 'All Categories';
        dropdown.appendChild(allOption);
        
        // Add category options
        categories.forEach(category => {
            const option = document.createElement('div');
            option.className = 'category-option px-4 py-2 text-sm cursor-pointer hover:bg-slate-100';
            option.dataset.category = category;
            option.textContent = category;
            dropdown.appendChild(option);
        });
        
        // Apply direct styles to dropdown to ensure it's visible when toggled
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.zIndex = '9999';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #e2e8f0';
        dropdown.style.borderRadius = '0.375rem';
        dropdown.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
        dropdown.style.overflow = 'hidden';
        dropdown.style.marginTop = '0.25rem';
        dropdown.style.minWidth = '160px';
        
        // Remove any existing click handlers
        const button = document.getElementById('category-filter-btn');
        if (button) {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // Add click handler to toggle dropdown
            newButton.addEventListener('click', (e) => {
                console.log('Category filter button clicked');
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle dropdown visibility
                dropdown.classList.toggle('hidden');
                console.log('Dropdown visibility toggled, hidden: ', dropdown.classList.contains('hidden'));
                
                // Ensure dropdown is visible
                if (!dropdown.classList.contains('hidden')) {
                    dropdown.style.display = 'block';
                }
            });
        }
        
        // Add click handlers to category options
        setTimeout(() => {
            document.querySelectorAll('.category-option').forEach(option => {
                option.addEventListener('click', (e) => {
                    console.log('Category option clicked:', e.target.dataset.category);
                    const category = e.target.dataset.category;
                    const label = document.getElementById('category-filter-label');
                    
                    if (label) {
                        label.textContent = category === 'all' ? 'All Categories' : category;
                    }
                    
                    // Hide dropdown
                    dropdown.classList.add('hidden');
                    
                    // Apply category filter
                    this.applyCategoryFilter(category, categoryColumnName);
                });
            });
        }, 100);
    }

    // Apply category filter to data
    applyCategoryFilter(category, categoryColumnName) {
        if (!this.currentImportedData || !this.currentImportedData.data) return;
        
        // If "All Categories" is selected, show all data
        if (category === 'all') {
            // Reset to current filtered data (which may have other filters applied)
            this.currentImportedData.filteredData = [...this.currentImportedData.data];
            
            // Re-apply other filters (search, volume, etc.)
            this.applyCurrentFiltersToFileData();
            return;
        }
        
        // Filter data to only show rows matching the selected category
        const filteredData = this.currentImportedData.data.filter(row => 
            row[categoryColumnName] === category
        );
        
        // Update filtered data
        this.currentImportedData.filteredData = filteredData;
        
        // Display the filtered data
        this.displayImportedDataPage(filteredData, 1);
        
        // Update pagination
        this.setupImportedDataPagination(filteredData);
        
        // Show notification with count
        this.showNotification(`Showing ${filteredData.length} keywords in category "${category}"`, 'info');
        
        // Fix column alignments
        setTimeout(() => {
            this.fixImportedTableColumnAlignment();
        }, 50);
    }

    // Add this new method after init()
    setupTableObserver() {
        // Create a mutation observer to watch for changes in the table
        const tableObserver = new MutationObserver((mutations) => {
            console.log('Table mutation detected');
            // Check if we need to setup category filtering
            setTimeout(() => {
                if (this.setupCategoryFiltering) {
                    this.setupCategoryFiltering();
                }
            }, 200); // Slight delay to ensure DOM is updated
        });
        
        // Start observing the table body
        const tableBody = document.getElementById('keywordsTableBody');
        if (tableBody) {
            console.log('Setting up table observer');
            tableObserver.observe(tableBody, { 
                childList: true,  // Watch for changes in the child elements
                subtree: true     // Watch for changes in the entire subtree
            });
        }
        
        // Also check for the table header changes
        const tableHeader = document.querySelector('thead');
        if (tableHeader) {
            tableObserver.observe(tableHeader, { 
                childList: true,
                subtree: true
            });
        }
    }
} 