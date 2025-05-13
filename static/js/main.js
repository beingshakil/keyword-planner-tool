// Define the notification function globally
function showNotification(message, duration = 3000) {
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed bottom-4 right-4 z-50';
        document.body.appendChild(notificationContainer);
    }

    // Create notification element
    const notification = document.createElement('div');
    const isDarkMode = document.body.classList.contains('dark-mode');
    notification.className = `${isDarkMode ? 'bg-slate-700' : 'bg-slate-800'} text-white py-2 px-4 rounded-md shadow-lg mb-2 flex items-center transition-opacity duration-500`;
    notification.innerHTML = `
        <i class="fas fa-check-circle text-green-400 mr-2"></i>
        <span>${message}</span>
    `;

    // Add to container
    notificationContainer.appendChild(notification);

    // Fade out and remove
    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, duration);
}

// Global utility for clipboard operations
function copyToClipboard(text, successCallback) {
    try {
        // Fallback method that works in all browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '0';
        textarea.style.top = '0';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        if (successful) {
            if (typeof successCallback === 'function') {
                successCallback();
            }
            return true;
        } else {
            console.error("Copy operation failed");
            return false;
        }
    } catch (err) {
        console.error("Clipboard error:", err);
        return false;
    }
}

// Global utility for save modal operations
function showSaveModal() {
    try {
        // Get the filtered keywords count
        let validKeywords = 0;
        if (window.selectedKeywordsSet) {
            window.selectedKeywordsSet.forEach(kw => {
                if (kw && kw.trim() !== '') {
                    validKeywords++;
                }
            });
        }
        
        // Find the save modal and update the count
        const saveModal = document.getElementById('save-keywords-modal');
        if (saveModal) {
            const countElement = saveModal.querySelector('.keywords-selected-count');
            if (countElement) {
                countElement.textContent = validKeywords;
            }
        }
        
        // Show the modal
        if (saveModal) {
            saveModal.classList.remove('hidden');
        }
        
        return true;
    } catch (err) {
        console.error('Error showing save modal:', err);
        return false;
    }
}

// Make sure these functions are available on the window object
window.showNotification = showNotification;
window.copyToClipboard = copyToClipboard;
window.showSaveModal = showSaveModal;

// Also make available globally by executing immediately
(function() {
    try {
        // Alternative global scope approach for environments where 'window' might be restricted
        this.showNotification = showNotification;
        this.copyToClipboard = copyToClipboard;
        this.showSaveModal = showSaveModal;
        console.log("Global utility functions registered successfully");
    } catch (e) {
        console.warn("Could not add functions to global scope:", e.message);
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode from localStorage
    initializeDarkMode();
    
    // Add the KD column fix function call
    fixKDColumnAlignment();
    
    // Set interval to check and fix KD column periodically
    setInterval(fixKDColumnAlignment, 500);
    
    // Initialize volume filter dropdowns
    setupVolumeFilter();
    
    // Initialize All Volumes dropdown
    setupAllVolumesDropdown();
    
    // Explicitly make sure the volume filters work
    console.log("Initializing volume filter dropdowns...");
    const mainVolumeBtn = document.getElementById('main-volume-filter-btn');
    if (mainVolumeBtn) {
        console.log("Found main volume filter button, setting up click handler");
        // Make triple sure we have a click listener
        mainVolumeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const dropdown = document.getElementById('main-volume-filter-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('hidden');
                dropdown.style.display = dropdown.classList.contains('hidden') ? 'none' : 'block';
                console.log(`Toggled dropdown visibility: ${!dropdown.classList.contains('hidden')}`);
            } else {
                console.warn("Dropdown element not found");
            }
        });
    } else {
        console.warn("Main volume filter button not found");
    }
    
    // Make sure filter options have click listeners
    const filterOptions = document.querySelectorAll('#main-volume-filter-dropdown .filter-option');
    filterOptions.forEach(option => {
        option.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const value = this.getAttribute('data-filter') || '';
            const text = this.textContent.trim();
            console.log(`Filter option clicked: ${text}, value: ${value}`);
            
            // Update label
            const label = document.getElementById('main-volume-filter-label');
            if (label) {
                label.textContent = text;
                console.log(`Updated label to ${text}`);
            }
            
            // Hide dropdown
            const dropdown = document.getElementById('main-volume-filter-dropdown');
            if (dropdown) {
                dropdown.classList.add('hidden');
                dropdown.style.display = 'none';
            }
            
            // Apply filter
            if (typeof window.currentVolumeFilter !== 'undefined') {
                window.currentVolumeFilter = value;
                if (typeof window.loadKeywords === 'function') {
                    const searchInput = document.getElementById('searchInput');
                    window.loadKeywords(searchInput?.value.trim() || '', 1);
                }
            }
        });
    });
    
    // Cache DOM elements
    const elements = {
        searchInput: document.getElementById('searchInput'),
        searchButton: document.getElementById('searchButton'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        thresholdInput: document.getElementById('threshold'),
        thresholdValue: document.getElementById('thresholdValue'),
        selectAllCheckbox: document.getElementById('selectAll'),
        exportBtn: document.getElementById('exportBtn'),
        copyBtn: document.getElementById('copyBtn'),
        keywordsTableBody: document.getElementById('keywordsTableBody'),
        mainTableView: document.getElementById('main-table-view'),
        paginationContainer: document.getElementById('pagination-controls'),
        mainPageSizeInput: document.getElementById('main-page-size-input'),
        searchTypeSelect: document.getElementById('searchTypeSelect'),
        // Volume filter elements
        volumeFilterBtn: document.getElementById('main-volume-filter-btn'),
        volumeFilterDropdown: document.getElementById('main-volume-filter-dropdown'),
        volumeFilterLabel: document.getElementById('main-volume-filter-label'),
        deselectBtn: document.getElementById('deselect-btn'), // Cache deselect button
        saveSelectedBtn: document.getElementById('save-selected-btn'), // Cache save selected button
        darkModeToggle: document.getElementById('dark-mode-toggle'), // Dark mode toggle button
    };

    // Monitor DOM for save dialog and update counts
    setupSaveModalObserver();

    // State variables
    let currentPageSize = 100;
    let currentSort = { column: 'keyword', order: 'asc' };
    let currentVolumeFilter = ''; // Store current volume filter
    window.currentVolumeFilter = currentVolumeFilter; // Expose to global scope
    let lastSearchTerm = ''; // Track last search term
    let selectedSuggestionIndex = -1; // Add state for suggestion selection
    let searchButtonOriginalContent = ''; // Store original button content
    let selectedKeywordsSet = new Set(); // Persistent set for selected keywords
    window.selectedKeywordsSet = selectedKeywordsSet; // Expose to global scope
    window.handleSort = handleSort; // Expose sort handler to global scope
    let lastChecked = null; // Track the last checkbox clicked for shift-select

    // Initialize UI state
    if (elements.copyBtn) {
        elements.copyBtn.classList.add('opacity-50');
        elements.copyBtn.disabled = true;
    }

    // Load initial data
    loadKeywords();

    // Set initial page size input value
    if (elements.mainPageSizeInput) {
        elements.mainPageSizeInput.value = currentPageSize;
    }

    // Setup event listeners
    setupEventListeners();
    
    // Setup search debounce functionality
    setupSearchDebounce();

    // Set initial button states after listeners are setup
    updateExportButtonState();
    updateCopyButtonState();
    updateSaveButtonState();
    updateSelectedCount(); // Also initialize the counter display
    
    // Initialize all action buttons with proper event handling
    if (typeof reinitializeActionButtons === 'function') {
        reinitializeActionButtons();
    } else {
        // Setup will happen in the setupEventListeners function
        console.log("Action buttons will be initialized during event listener setup");
    }

    // Initialize SavedKeywords module
    if (window.SavedKeywords) {
        window.SavedKeywords.init();
    }

    // --- Setup Deselect All Button Listener ---
    if (elements.deselectBtn) {
        elements.deselectBtn.addEventListener('click', () => {
            // 1. Clear the master Set
            selectedKeywordsSet.clear();

            // 2. Uncheck every keyword checkbox currently visible in the main table
            document.querySelectorAll('#keywordsTableBody input[type="checkbox"][data-keyword]')
              .forEach(cb => { cb.checked = false; });

            // 3. Refresh all relevant UI states
            updateSelectedCount();          // Update counter (will hide itself)
            updateSelectAllCheckboxState(); // Update the main select all checkbox state
            updateExportButtonState();      // Update export button state
            updateCopyButtonState();        // Update copy button state
            updateSaveButtonState();        // Update save button state
        });
    }
    // --- End Deselect All Setup ---

    function setupEventListeners() {
        // Page size input handler
        if (elements.mainPageSizeInput) {
            elements.mainPageSizeInput.addEventListener('change', function() {
                let newPageSize = parseInt(this.value) || 100;
                // Enforce min/max values
                newPageSize = Math.max(10, Math.min(1000, newPageSize));
                if (this.value !== newPageSize.toString()) this.value = newPageSize;

                // Update state and reload if changed
                if (newPageSize !== currentPageSize) {
                    currentPageSize = newPageSize;
                    loadKeywords(elements.searchInput?.value.trim() || '', 1);
                }
            });
        }

        // View switching
        if (elements.mainTableView) {
            elements.mainTableView.addEventListener('click', e => {
                e.preventDefault();
                document.getElementById('main-table-content').classList.remove('hidden');
                document.getElementById('saved-keywords-content').classList.add('hidden');

                // Update sidebar
                document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));
                elements.mainTableView.classList.add('active');

                // Clean up any empty entries in the selectedKeywordsSet
                const cleanedSet = new Set();
                selectedKeywordsSet.forEach(kw => {
                    if (kw && kw.trim() !== '') {
                        cleanedSet.add(kw);
                    }
                });
                selectedKeywordsSet = cleanedSet;
                window.selectedKeywordsSet = selectedKeywordsSet; // Update global reference

                // Reset filters when switching to main view
                resetFilters();
                
                // Reload keywords without clearing the selectedKeywordsSet
                loadKeywords('', 1);
                
                // Make sure the button states are correct
                updateExportButtonState();
                updateCopyButtonState();
                updateSaveButtonState();
                updateSelectedCount();
                
                // Reinitialize all action buttons to ensure proper event handling
                reinitializeActionButtons();
            });
        }

        // Volume filter dropdown
        setupVolumeFilter();

        // Threshold input
        if (elements.thresholdInput && elements.thresholdValue) {
            elements.thresholdInput.addEventListener('input', function() {
                // Validate threshold value
                let value = parseInt(this.value) || 0;
                value = Math.max(0, Math.min(100, value));
                if (this.value !== value.toString()) this.value = value;

                handleSearch();
            });
        }

        // Search functionality
        if (elements.searchButton) {
            elements.searchButton.addEventListener('click', function(e) {
                e.preventDefault();
                handleSearch();
            });
        }

        if (elements.searchInput) {
            // Use keydown instead of keypress to capture arrow keys etc.
            elements.searchInput.addEventListener('keydown', e => {
                const suggestionsContainer = document.getElementById('suggestionsContainer');
                const suggestionsVisible = suggestionsContainer && !suggestionsContainer.classList.contains('hidden');
                const suggestionItems = suggestionsContainer ? suggestionsContainer.querySelectorAll('.suggestion-item') : [];

                if (suggestionsVisible && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
                    e.preventDefault(); // Prevent default actions like form submission or cursor movement

                    if (e.key === 'ArrowDown') {
                        selectedSuggestionIndex++;
                        if (selectedSuggestionIndex >= suggestionItems.length) {
                            selectedSuggestionIndex = 0; // Wrap around
                        }
                        updateSuggestionHighlight(suggestionItems);
                    } else if (e.key === 'ArrowUp') {
                        selectedSuggestionIndex--;
                        if (selectedSuggestionIndex < 0) {
                            selectedSuggestionIndex = suggestionItems.length - 1; // Wrap around
                        }
                        updateSuggestionHighlight(suggestionItems);
                    } else if (e.key === 'Enter') {
                        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < suggestionItems.length) {
                            const selectedText = suggestionItems[selectedSuggestionIndex].textContent;
                            elements.searchInput.value = selectedText;
                            suggestionsContainer.classList.add('hidden');
                            selectedSuggestionIndex = -1; // Reset selection
                            handleSearch(); // Trigger search with the selected suggestion
                        } else {
                            // If Enter is pressed but no suggestion is highlighted, just search
                           suggestionsContainer.classList.add('hidden'); // Hide suggestions
                           selectedSuggestionIndex = -1; // Reset selection
                           handleSearch();
                        }
                    } else if (e.key === 'Escape') {
                        suggestionsContainer.classList.add('hidden');
                        selectedSuggestionIndex = -1; // Reset selection
                    }
                } else if (e.key === 'Enter') {
                     // Handle enter when suggestions are not visible (standard search)
                     // Check if suggestions *just* got hidden by the blur timeout
                     const suggestionsContainer = document.getElementById('suggestionsContainer');
                     if (suggestionsContainer) suggestionsContainer.classList.add('hidden'); // Ensure hidden
                     selectedSuggestionIndex = -1;
                     handleSearch();
                }
            });

            // Only fetch suggestions while typing, but don't search
            let suggestionsTimeout;
            elements.searchInput.addEventListener('input', () => {
                clearTimeout(suggestionsTimeout);
                suggestionsTimeout = setTimeout(() => {
                    fetchSuggestions(elements.searchInput.value);
                }, 500);

                // Toggle clear button visibility
                toggleClearButton();
            });

            // Visual feedback
            elements.searchInput.addEventListener('focus', () => {
                const button = elements.searchButton;
                if (button) button.classList.add('hover:shadow-lg');

                // Check if clear button should be visible
                toggleClearButton();
            });

            elements.searchInput.addEventListener('blur', () => {
                const button = elements.searchButton;
                if (button) button.classList.remove('hover:shadow-lg');
                setTimeout(() => {
                    const suggestionsContainer = document.getElementById('suggestionsContainer');
                    if (suggestionsContainer) suggestionsContainer.classList.add('hidden');
                }, 200);
            });
        }

        // Clear search input button
        if (elements.clearSearchBtn) {
            elements.clearSearchBtn.addEventListener('click', () => {
                if (elements.searchInput) {
                    elements.searchInput.value = '';
                    elements.searchInput.focus();
                    toggleClearButton();

                    // Hide suggestions
                    const suggestionsContainer = document.getElementById('suggestionsContainer');
                    if (suggestionsContainer) suggestionsContainer.classList.add('hidden');

                    // Reset search results
                    lastSearchTerm = '';
                    loadKeywords('', 1);
                }
            });
        }

        // Sort functionality
        document.querySelectorAll('.sortable').forEach(header => {
            header.addEventListener('click', handleSort);
        });

        // Select all functionality
        const tableContainer = document.getElementById('main-table-content'); // Assuming this is a static parent
        if (tableContainer) {
            tableContainer.addEventListener('change', function(event) {
                if (event.target.id === 'selectAll') {
                    const selectAllCheckboxElement = event.target;
                    const allKeywordCheckboxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"][data-keyword]');

                    allKeywordCheckboxes.forEach(checkbox => {
                        const kw = checkbox.dataset.keyword;
                        if (!kw || kw.trim() === '') return; // Skip empty keywords
                        
                        checkbox.checked = selectAllCheckboxElement.checked;
                        if (kw) { // Ensure keyword exists
                            if (selectAllCheckboxElement.checked) {
                                selectedKeywordsSet.add(kw);
                            } else {
                                selectedKeywordsSet.delete(kw);
                            }
                        }
                    });
                    updateSelectedCount();
                    updateExportButtonState();
                    updateCopyButtonState();
                    updateSaveButtonState();
                }
            });
        }

        // Checkbox click handler
        if (elements.keywordsTableBody) {
            elements.keywordsTableBody.addEventListener('click', e => {
                const box = e.target;
                // Ensure the click was directly on a keyword checkbox
                if (!box.matches('input[type="checkbox"][data-keyword]')) return;

                // Gather all visible keyword checkboxes in order
                const boxes = Array.from(
                  elements.keywordsTableBody.querySelectorAll('input[type="checkbox"][data-keyword]')
                );

                if (e.shiftKey && lastChecked && lastChecked !== box) {
                  // If Shift is down, select the range
                  const start = boxes.indexOf(lastChecked);
                  const end   = boxes.indexOf(box);

                  // Make sure both start and end checkboxes are found in the current view
                  if (start !== -1 && end !== -1) {
                      const [min, max] = [Math.min(start, end), Math.max(start, end)];
                      // Set the state based on the box that was actually clicked
                      const targetState = box.checked;
                      for (let i = min; i <= max; i++) {
                        const cb = boxes[i];
                        // Only update if the state is different
                        if (cb.checked !== targetState) {
                            cb.checked = targetState;
                            updateSelection(cb); // Use the common update function
                        }
                      }
                      // Re-ensure the clicked box's state matches targetState
                      // (in case it was the only one needing change)
                      if (box.checked !== targetState) {
                          box.checked = targetState;
                      }
                      // We call updateSelection once for the clicked box outside the loop
                      // if it wasn't handled inside (e.g. single-item range)
                      // but updateSelection was already called in the loop if needed.
                      // To avoid duplicate calls, let's simplify and just ensure state is updated.
                      // updateSelection(box); // Potentially redundant call removed

                  } else {
                     // If range start/end not found in current view, treat as single click
                     updateSelection(box);
                  }
                } else {
                  // Normal single-click
                  updateSelection(box); // Use the common update function
                }

                // Remember this checkbox for the next Shift-click
                lastChecked = box;
              });
        }

        // Export functionality
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', exportSelected);
            updateExportButtonState();
        }

        // Copy functionality
        if (elements.copyBtn) {
            elements.copyBtn.addEventListener('click', function() {
                try {
                    copySelected();
                } catch (err) {
                    console.error("Error in copy operation:", err);
                    alert("Failed to copy keywords: " + err.message);
                }
            });
            updateCopyButtonState();
        }

        // Add click handlers
        document.querySelectorAll('.pagination-btn:not([disabled])').forEach(btn => {
            btn.addEventListener('click', function() {
                const pageNum = parseInt(this.dataset.page);
                if (!isNaN(pageNum)) {
                    // Handle both server-side and client-side pagination
                    loadKeywords(elements.searchInput?.value.trim() || '', pageNum);

                    // Scroll to top of results
                    const tableContainer = document.querySelector('.table-container');
                    if (tableContainer) {
                        tableContainer.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Handle volume filter click
        function handleVolumeFilter(event) {
            event.preventDefault();
            
            const filter = this.getAttribute('data-filter');
            const label = this.textContent.trim();
            
            // Update button label
            if (elements.volumeFilterLabel) {
                elements.volumeFilterLabel.textContent = label;
            }
            
            // Close dropdown
            elements.volumeFilterDropdown.classList.add('hidden');
            
            // Update state
            currentVolumeFilter = filter;
            window.currentVolumeFilter = filter; // Update global variable
            
            // Reload with new filter
            loadKeywords(elements.searchInput?.value.trim() || '', 1);
        }

        // Table header sorting
        const headers = document.querySelectorAll('#main-table-view th[data-sort]');
        headers.forEach(header => {
            header.addEventListener('click', handleSort);
        });

        // Volume filter dropdown
        const volumeDropdownItems = elements.volumeFilterDropdown?.querySelectorAll('.dropdown-item');
        volumeDropdownItems?.forEach(item => {
            item.addEventListener('click', handleVolumeFilter);
        });

        // Checkbox state changes
        elements.mainTableView?.addEventListener('change', event => {
            if (event.target.type === 'checkbox' && !event.target.id !== 'selectAll') {
                updateCheckboxStates();
            }
        });
    }

    function updateSelectAllCheckboxState() {
        const selectAllCheckbox = document.getElementById('selectAll'); // Get fresh reference
        if (!selectAllCheckbox) return;

        const checkboxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"][data-keyword]');
        const checkedBoxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"][data-keyword]:checked');

        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (checkedBoxes.length === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
    }

    function updateButtonState(button, hasSelection) {
        if (!button) return;

        if (hasSelection) {
            button.classList.remove('opacity-50');
            button.disabled = false;
        } else {
            button.classList.add('opacity-50');
            button.disabled = true;
        }
    }

    function updateExportButtonState() {
        if (!elements.exportBtn) return;

        const hasSelection = selectedKeywordsSet.size > 0; // Check the Set size
        updateButtonState(elements.exportBtn, hasSelection);

        // Add hover state only if enabled
        if (hasSelection) {
            elements.exportBtn.classList.add('hover:bg-blue-700');
        } else {
            elements.exportBtn.classList.remove('hover:bg-blue-700');
        }
    }

    function updateCopyButtonState() {
        if (!elements.copyBtn) return;

        const hasSelection = selectedKeywordsSet.size > 0; // Check the Set size
        updateButtonState(elements.copyBtn, hasSelection);

        // Add hover state only if enabled
        if (hasSelection) {
            elements.copyBtn.classList.add('hover:bg-indigo-700');
        } else {
            elements.copyBtn.classList.remove('hover:bg-indigo-700');
        }
    }

    function updateSaveButtonState() {
        if (!elements.saveSelectedBtn) return;

        const hasSelection = selectedKeywordsSet.size > 0; // Check the Set size
        updateButtonState(elements.saveSelectedBtn, hasSelection);

        // Add hover state only if enabled
        if (hasSelection) {
            elements.saveSelectedBtn.classList.add('hover:bg-amber-600'); // Assuming amber for save button
        } else {
            elements.saveSelectedBtn.classList.remove('hover:bg-amber-600');
        }
    }

    // Optimized search handling with debounce
    function handleSearch() {
        const searchTerm = elements.searchInput ? elements.searchInput.value.trim() : '';
        const threshold = elements.thresholdInput ? parseInt(elements.thresholdInput.value) || 70 : 70;
        const searchType = elements.searchTypeSelect ? elements.searchTypeSelect.value : 'partial';
        
        // Save original button state before showing loading
        if (elements.searchButton && !searchButtonOriginalContent) {
            searchButtonOriginalContent = elements.searchButton.innerHTML;
            elements.searchButton.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>';
            elements.searchButton.disabled = true;
        }

        // Store the search term
        lastSearchTerm = searchTerm;
        
        // Load with the new parameters
        loadKeywords(searchTerm, 1, threshold, searchType);
    }

    // Implemented debouncing for search input
    let searchDebounceTimer;
    function setupSearchDebounce() {
        if (!elements.searchInput) return;
        
        elements.searchInput.addEventListener('input', function() {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = setTimeout(() => {
                const searchTerm = this.value.trim();
                if (searchTerm.length > 1 || searchTerm === '') {
                    // Only search if we have at least 2 characters or empty (reset)
                    handleSearch();
                }
            }, 300); // 300ms debounce delay
            
            // Also update suggestions (if enabled)
            fetchSuggestions(this.value);
            toggleClearButton();
        });
    }
    
    // Performance-optimized function to fetch keywords
    function loadKeywords(searchTerm = '', page = 1, threshold = null, searchType = null) {
        // Clear any existing timer
        if (window.keywordLoadTimer) {
            clearTimeout(window.keywordLoadTimer);
        }
        
        // Show loading state in table
        const tbody = elements.keywordsTableBody;
        if (tbody) {
            // Instead of clearing, we show a loading indicator
            if (!document.getElementById('keywords-loading-indicator')) {
                tbody.innerHTML = `
                    <tr id="keywords-loading-indicator">
                        <td colspan="4" class="py-6 text-center">
                            <div class="flex flex-col items-center">
                                <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                <p class="text-sm text-slate-600">Loading keywords...</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }

        // Build query params - use optional parameters if provided
        const params = new URLSearchParams({
            page: page,
            page_size: currentPageSize,
            sort: currentSort.column,
            order: currentSort.order
        });
        
        // Add search parameters if they exist
        if (searchTerm) params.append('search', searchTerm);
        if (threshold !== null) params.append('threshold', threshold);
        if (searchType) params.append('search_type', searchType);
        if (currentVolumeFilter) params.append('volume_filter', currentVolumeFilter);

        // Fetch data with a small delay to allow for cancellations
        window.keywordLoadTimer = setTimeout(() => {
            fetch(`/api/keywords?${params.toString()}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    // Process the data - ensure data.results exists
                    const results = data.results || [];
                    const pagination = data.pagination || { page: 1, total_pages: 1, total_results: 0 };
                    
                    // Display the results - no need for client-side filtering anymore
                    displayResults(results, pagination);
                    
                    // Reset the search button after successful load
                    if (elements.searchButton && searchButtonOriginalContent) {
                        elements.searchButton.innerHTML = searchButtonOriginalContent;
                        elements.searchButton.disabled = false;
                        searchButtonOriginalContent = '';
                    }
                })
                .catch(error => {
                    if (tbody) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="4" class="py-6 text-center">
                                    <div class="flex flex-col items-center gap-3">
                                        <div class="p-3 rounded-full bg-red-100">
                                            <i class="fas fa-exclamation-circle text-red-500 text-xl"></i>
                                        </div>
                                        <div class="text-center">
                                            <p class="text-red-500 font-medium">Error loading keywords</p>
                                            <p class="text-sm text-slate-700 mt-1">${error.message}</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }
                    updatePagination({page: 1, total_pages: 1, total_results: 0});
                    
                    // Reset the search button
                    if (elements.searchButton && searchButtonOriginalContent) {
                        elements.searchButton.innerHTML = searchButtonOriginalContent;
                        elements.searchButton.disabled = false;
                        searchButtonOriginalContent = '';
                    }
                });
        }, 50); // Small delay for better UX
    }

    // Display results in the table
    function displayResults(data, pagination) {
        const tbody = elements.keywordsTableBody;
        if (!tbody) return;

        // Use document fragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Clear previous results
        tbody.innerHTML = '';

        // Fix for KD column name - ensure it stays as "KD" not "Value"
        const valueHeader = document.querySelector('th[data-sort="value"] .font-semibold');
        if (valueHeader && valueHeader.textContent !== 'KD') {
            valueHeader.textContent = 'KD';
        }

        let exactMatchIndex = -1;
        // Check for exact match if a search term was used
        if (lastSearchTerm && data && Array.isArray(data)) {
            const searchTermLower = lastSearchTerm.toLowerCase();
            exactMatchIndex = data.findIndex(item => item.keyword.toLowerCase() === searchTermLower);

            // If exact match found, move it to the top of the *current page* data
            if (exactMatchIndex > 0) { // No need to move if it's already first
                const [exactMatchItem] = data.splice(exactMatchIndex, 1);
                data.unshift(exactMatchItem);
                exactMatchIndex = 0; // It's now the first item
            }
        }

        if (!data || !Array.isArray(data) || data.length === 0) {
            // Show empty state
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `
                <td colspan="4" class="py-6 text-center">
                    ${lastSearchTerm || currentVolumeFilter
                        ? `<div class="flex flex-col items-center gap-3 py-6">
                            <div class="p-3 rounded-full bg-slate-100">
                                <i class="fas fa-search text-slate-400 text-xl"></i>
                            </div>
                            <div class="text-center">
                                <p class="text-slate-700 font-medium mb-1">No keywords found</p>
                                <p class="text-sm text-slate-500">Try adjusting your search or filters</p>
                            </div>
                           </div>`
                        : `<div class="flex flex-col items-center gap-3 py-6">
                            <div class="p-3 rounded-full bg-slate-100">
                                <i class="fas fa-database text-slate-400 text-xl"></i>
                            </div>
                            <div class="text-center">
                                <p class="text-slate-700 font-medium">No keywords available</p>
                                <p class="text-sm text-slate-500">Try importing a keyword list</p>
                            </div>
                           </div>`
                    }
                </td>
            `;
            fragment.appendChild(emptyRow);

            // Reset UI state
            if (elements.selectAllCheckbox) {
                elements.selectAllCheckbox.checked = false;
                elements.selectAllCheckbox.indeterminate = false;
            }
            updateExportButtonState();
            updateCopyButtonState();
            updateSaveButtonState();
            
            // Append the fragment
            tbody.appendChild(fragment);
            
            // Update pagination
            updatePagination(pagination);
            return;
        }

        // Render keywords
        data.forEach((keyword, index) => {
            if (!keyword) return;

            const tr = document.createElement('tr');
            // Add highlight class if this is the exact match
            const isExactMatch = index === exactMatchIndex;
            tr.className = `table-row ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${isExactMatch ? 'exact-match-highlight' : ''}`;

            // Get keyword data
            const keywordText = keyword.keyword || '';
            
            // Skip rendering checkboxes for empty keywords
            if (!keywordText || keywordText.trim() === '') {
                tr.innerHTML = `
                    <td class="col-checkbox text-center">
                        <div class="w-4 h-4"></div>
                    </td>
                    <td class="text-sm font-medium text-slate-500 italic">
                        <span>Empty keyword</span>
                    </td>
                    <td class="text-sm text-slate-700">
                        <span class="volume-badge bg-gray-50 text-gray-400">NA</span>
                    </td>
                    <td class="text-sm text-slate-700">
                        <span class="text-gray-400">–</span>
                    </td>
                `;
                fragment.appendChild(tr);
                return;
            }
            
            const volume = keyword.volume || '';
            const value = keyword.value || '';
            const matchPercentage = keyword.match_percentage;

            // Check if the keyword is in the persistent set
            const isChecked = selectedKeywordsSet.has(keywordText);

            // Highlight matched keyword if searching
            const keywordDisplay = lastSearchTerm
                ? highlightMatch(keywordText, lastSearchTerm)
                : keywordText;

            // Create match badge if we have a match percentage
            let matchBadge = '';
            if (matchPercentage) {
                const matchColor = matchPercentage >= 90 ? 'bg-green-100 text-green-800' :
                                  matchPercentage >= 75 ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800';

                matchBadge = `
                    <span class="${matchColor} text-xs px-2 py-0.5 rounded ml-2 font-medium">
                        ${Math.round(matchPercentage)}%
                    </span>`;
            }
            
            // Format volume with badges - streamlined design
            let volumeDisplay = '';
            if (volume) {
                // Style differently based on volume level
                if (volume.includes('10M')) {
                    volumeDisplay = `<span class="volume-badge bg-green-50 text-green-700 border border-green-100">${volume}</span>`;
                } else if (volume.includes('1M')) {
                    volumeDisplay = `<span class="volume-badge bg-blue-50 text-blue-700 border border-blue-100">${volume}</span>`;
                } else if (volume.includes('100K')) {
                    volumeDisplay = `<span class="volume-badge bg-indigo-50 text-indigo-700 border border-indigo-100">${volume}</span>`;
                } else if (volume.includes('10K')) {
                    volumeDisplay = `<span class="volume-badge bg-purple-50 text-purple-700 border border-purple-100">${volume}</span>`;
                } else if (volume.toLowerCase() === 'na' || volume === '') {
                    volumeDisplay = `<span class="volume-badge bg-slate-50 text-slate-500 border border-slate-100">N/A</span>`;
                } else {
                    volumeDisplay = `<span class="volume-badge bg-slate-50 text-slate-700 border border-slate-100">${volume}</span>`;
                }
            } else {
                volumeDisplay = `<span class="volume-badge bg-slate-50 text-slate-500 border border-slate-100">N/A</span>`;
            }
            
            // Format KD/value with improved progress bar
            let valueDisplay = '';
            if (value && value !== '') {
                // Try to parse the value as a number
                const valueNum = parseFloat(value);
                if (!isNaN(valueNum)) {
                    // Normalize between 0-100 if possible
                    const normalizedValue = Math.min(100, Math.max(0, valueNum));
                    let valueColor = 'bg-green-500';
                    
                    // Determine color based on value
                    if (normalizedValue > 80) {
                        valueColor = 'bg-red-500';
                    } else if (normalizedValue > 60) {
                        valueColor = 'bg-orange-500';
                    } else if (normalizedValue > 40) {
                        valueColor = 'bg-yellow-500';
                    } else if (normalizedValue > 20) {
                        valueColor = 'bg-green-500';
                    } else {
                        valueColor = 'bg-green-400';
                    }
                    
                    valueDisplay = `
                        <div class="flex items-center">
                            <span class="text-sm font-medium w-6 mr-2">${value}</span>
                            <div class="value-bar-container">
                                <div class="value-bar ${valueColor}" style="width: ${normalizedValue}%"></div>
                            </div>
                        </div>
                    `;
                } else {
                    valueDisplay = value;
                }
            } else {
                valueDisplay = `<span class="text-slate-400">–</span>`;
            }

            tr.innerHTML = `
                <td class="col-checkbox text-center">
                    <input type="checkbox"
                          class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          data-keyword="${keywordText}"
                          ${isChecked ? 'checked' : ''}>
                </td>
                <td class="text-sm font-medium text-slate-900">
                    <div class="flex items-center flex-wrap">
                        <span title="${keywordText}">${keywordDisplay}</span>
                        ${matchBadge}
                    </div>
                </td>
                <td class="text-sm">
                    ${volumeDisplay}
                </td>
                <td class="text-sm">
                    ${valueDisplay}
                </td>
            `;
            fragment.appendChild(tr);

            // Add event listener to the checkbox after appending to the fragment
            const checkbox = tr.querySelector('input[type="checkbox"]');
            if (checkbox) {
                checkbox.addEventListener('change', function() {
                    updateSelection(this);
                });
            }
        });

        // Add the fragment to the tbody
        tbody.appendChild(fragment);

        // Update sort indicators
        document.querySelectorAll('.sortable i').forEach(icon => {
            icon.className = 'fas fa-sort ml-2 text-slate-400 text-xs';
        });

        const currentHeader = document.querySelector(`[data-sort="${currentSort.column}"] i`);
        if (currentHeader) {
            currentHeader.className = `fas fa-sort-${currentSort.order === 'asc' ? 'up' : 'down'} ml-2 text-blue-500 text-xs`;
        }

        // Reset UI state based on selectedKeywordsSet
        updateSelectAllCheckboxState();
        updateExportButtonState();
        updateCopyButtonState();
        updateSaveButtonState();
        updatePagination(pagination);
        updateSelectedCount(); // Update count after rendering results
    }

    // Optimized pagination with better design
    function updatePagination(pagination) {
        const paginationContainer = elements.paginationContainer;
        if (!paginationContainer) return;

        const {page, total_pages, total_results} = pagination;

        // Hide pagination if there are no results or only one page
        if (total_results === 0 || total_pages <= 1) {
            paginationContainer.classList.add('hidden');
            return;
        }

        // Show pagination
        paginationContainer.classList.remove('hidden');

        // Create a more efficient algorithm for which pages to show
        // Always show first, last, current, and up to 1 page on each side of current
        let pageButtons = [1];
        if (total_pages > 1) pageButtons.push(total_pages);
        
        // Add current page and pages around it more efficiently
        const startPage = Math.max(2, page - 1);
        const endPage = Math.min(total_pages - 1, page + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            pageButtons.push(i);
        }

        // Sort and deduplicate
        pageButtons = [...new Set(pageButtons)].sort((a, b) => a - b);

        // Calculate visible result range with better formatting
        const firstItem = total_results === 0 ? 0 : (page - 1) * currentPageSize + 1;
        const lastItem = Math.min(page * currentPageSize, total_results);
        const resultRange = `${firstItem}-${lastItem} of ${total_results}`;

        // Create pagination HTML with fewer DOM elements and better structure
        let paginationHTML = `
            <div class="flex flex-col sm:flex-row justify-between items-center text-sm text-slate-600 py-2 px-3 gap-2">
                <div>
                    ${resultRange} keywords
                </div>
                <div class="flex items-center gap-1">
        `;

        // Previous page button with simpler design
        paginationHTML += `
            <button class="pagination-btn flex items-center px-2 py-1 rounded-md ${page > 1 ? '' : 'opacity-50 cursor-not-allowed'}"
                    ${page > 1 ? 'data-page="' + (page - 1) + '"' : 'disabled'}>
                <i class="fas fa-chevron-left text-xs"></i>
            </button>
        `;

        // Page number buttons with more efficient logic
        let lastButton = 0;
        for (const pageNum of pageButtons) {
            // Add ellipsis if there's a gap
            if (pageNum - lastButton > 1) {
                paginationHTML += `<span class="px-2 py-1 text-slate-400">...</span>`;
            }

            // Add page button with active state
            const isActive = pageNum === page;
            paginationHTML += `
                <button class="pagination-btn w-8 h-8 flex items-center justify-center rounded-md ${isActive ? 'active' : ''}" 
                        data-page="${pageNum}">
                    ${pageNum}
                </button>
            `;

            lastButton = pageNum;
        }

        // Next page button with simpler design
        paginationHTML += `
            <button class="pagination-btn flex items-center px-2 py-1 rounded-md ${page < total_pages ? '' : 'opacity-50 cursor-not-allowed'}"
                    ${page < total_pages ? 'data-page="' + (page + 1) + '"' : 'disabled'}>
                <i class="fas fa-chevron-right text-xs"></i>
            </button>
        `;

        paginationHTML += `
                </div>
            </div>
        `;

        // Set inner HTML in one operation for better performance
        paginationContainer.innerHTML = paginationHTML;

        // Use event delegation for pagination clicks to reduce listeners
        paginationContainer.addEventListener('click', function(e) {
            const target = e.target.closest('.pagination-btn:not([disabled])');
            if (!target) return;
            
            const pageNum = parseInt(target.dataset.page);
            if (!isNaN(pageNum)) {
                // Load the new page
                loadKeywords(elements.searchInput?.value.trim() || '', pageNum);

                // Scroll to top of results
                const tableContainer = document.querySelector('.table-container');
                if (tableContainer) {
                    tableContainer.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });
    }

    // Helper functions
    function highlightMatch(text, searchTerm) {
        if (!searchTerm) return text;

        try {
            searchTerm = searchTerm.toLowerCase();
            const index = text.toLowerCase().indexOf(searchTerm);

            if (index >= 0) {
                const before = text.substring(0, index);
                const match = text.substring(index, index + searchTerm.length);
                const after = text.substring(index + searchTerm.length);
                return `${before}<span class="bg-yellow-100 text-yellow-800 font-medium px-1 rounded">${match}</span>${after}`;
            }

            // Check for word matches
            const words = searchTerm.split(' ');
            let result = text;
            for (const word of words) {
                if (word.length > 2) { // Only highlight meaningful words
                    const regex = new RegExp(word, 'gi');
                    result = result.replace(regex, match => `<span class="bg-yellow-100 text-yellow-800 font-medium px-1 rounded">${match}</span>`);
                }
            }
            return result;
        } catch (e) {
            return text;
        }
    }

    function formatNumber(num) {
        if (!num) return 'NA';
        return num.toString();
    }

    // Helper to extract numeric value from volume strings like "1M - 10M"
    function extractNumberFromVolumeString(volumeStr) {
        if (!volumeStr || typeof volumeStr !== 'string') return NaN;
        
        // Special handling for common volume formats
        if (volumeStr.includes('10M')) return 10000000;
        if (volumeStr.includes('1M')) return 1000000;
        if (volumeStr.includes('100K')) return 100000;
        if (volumeStr.includes('10K')) return 10000;
        
        // Generic extraction for other formats
        const matches = volumeStr.match(/(\d+(?:\.\d+)?)/g);
        if (matches && matches.length > 0) {
            let num = parseFloat(matches[0]);
            
            // Apply multiplier based on K/M/B suffix
            if (volumeStr.includes('K')) num *= 1000;
            if (volumeStr.includes('M')) num *= 1000000;
            if (volumeStr.includes('B')) num *= 1000000000;
            
            return num;
        }
        
        return NaN;
    }

    function showSuccessTick(button, originalHTML) {
        // Save original button content
        const originalContent = originalHTML || button.innerHTML;

        // Show check icon
        button.innerHTML = '<i class="fas fa-check text-lg"></i>';
        button.disabled = true;

        // Return to original state after 3 seconds
        setTimeout(() => {
            button.innerHTML = originalContent;
            button.disabled = false;
        }, 3000);
    }

    function exportSelected() {
        const keywordsToExport = Array.from(selectedKeywordsSet);

        if (keywordsToExport.length === 0) {
            alert('Please select at least one keyword to export');
            return;
        }

        // Filter out empty keywords
        const filteredKeywords = keywordsToExport.filter(kw => kw && kw.trim() !== '');
        if (filteredKeywords.length === 0) {
            alert('Cannot export empty keywords');
            return;
        }

        const originalExportBtn = elements.exportBtn.innerHTML;

        if (elements.exportBtn) {
            elements.exportBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div><span>Exporting...</span>';
            elements.exportBtn.disabled = true;
            elements.exportBtn.classList.add('opacity-70');
        }

        const keywordsData = [];
        
        filteredKeywords.forEach(keyword => {
            let volume = '', value = '';
            const rows = document.querySelectorAll('#keywordsTableBody tr');
            
            for (const row of rows) {
                const checkbox = row.querySelector(`input[type="checkbox"][data-keyword="${keyword}"]`);
                if (checkbox) {
                    const cells = row.querySelectorAll('td');
                    try {
                        const volumeSpan = cells[2]?.querySelector('span');
                        if (volumeSpan) {
                            volume = volumeSpan.textContent.trim().replace(/,/g,'') || '';
                        } else {
                            volume = cells[2]?.textContent.trim().replace(/,/g,'') || '';
                        }
                        
                        const valueSpan = cells[3]?.querySelector('span');
                        if (valueSpan) {
                            const valueText = valueSpan.textContent.trim();
                            const match = valueText.match(/\((\d+)\)/);
                            if (match && match[1]) {
                                value = match[1];
                            } else {
                                value = valueText;
                            }
                        } else {
                            value = cells[3]?.textContent.trim() || '';
                        }
                    } catch (e) {
                        console.error(`Error extracting data for: ${keyword}`, e);
                    }
                    break;
                }
            }
            
            keywordsData.push({
                keyword: keyword,
                volume: volume,
                value: value
            });
        });

        fetch('/api/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ keywords: filteredKeywords, data: keywordsData })
        })
        .then(response => {
            if (!response.ok) throw new Error('Export failed');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'selected_keywords.csv';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();

            elements.exportBtn.classList.remove('opacity-70');
            showSuccessTick(elements.exportBtn, originalExportBtn);
            showNotification(`${filteredKeywords.length} keywords exported to CSV`);
        })
        .catch(error => {
            alert('Error exporting keywords: ' + error.message);
            if (elements.exportBtn) {
                elements.exportBtn.innerHTML = originalExportBtn;
                elements.exportBtn.disabled = false;
                elements.exportBtn.classList.remove('opacity-70');
            }
        });
    }

    function copySelected() {
        try {
            // Get keywords from the global set
            const keywordsToCopy = Array.from(window.selectedKeywordsSet || selectedKeywordsSet);
            
            // Validate we have keywords to copy
            if (!keywordsToCopy || keywordsToCopy.length === 0) {
                alert('Please select at least one keyword to copy');
                return;
            }
            
            // Filter out empty keywords
            const filteredKeywords = keywordsToCopy.filter(kw => kw && kw.trim() !== '');
            if (filteredKeywords.length === 0) {
                alert('Cannot copy empty keywords');
                return;
            }
            
            // Save original button HTML
            const originalCopyBtn = elements.copyBtn.innerHTML;
            elements.copyBtn.setAttribute('data-original-html', originalCopyBtn);
            
            // Show loading state
            if (elements.copyBtn) {
                elements.copyBtn.innerHTML = '<div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div><span>Copying...</span>';
                elements.copyBtn.disabled = true;
            }
            
            // Generate TSV
            let tsv = 'keyword\tvolume\tvalue\n';
            
            filteredKeywords.forEach(keyword => {
                // Find the row for this keyword
                let volume = '', value = '';
                
                // Get all rows in the table
                const rows = document.querySelectorAll('#keywordsTableBody tr');
                
                // Find the row that contains this keyword
                for (const row of rows) {
                    const checkbox = row.querySelector(`input[type="checkbox"][data-keyword="${keyword}"]`);
                    if (checkbox) {
                        const cells = row.querySelectorAll('td');
                        try {
                            // Get volume from cell 2 (index 2)
                            const volumeSpan = cells[2]?.querySelector('span');
                            if (volumeSpan) {
                                volume = volumeSpan.textContent.trim().replace(/,/g,'') || '';
                            } else {
                                volume = cells[2]?.textContent.trim().replace(/,/g,'') || '';
                            }
                            
                            // Get value from cell 3 (index 3) - extract number from "Low (10)"
                            const valueSpan = cells[3]?.querySelector('span');
                            if (valueSpan) {
                                const valueText = valueSpan.textContent.trim();
                                const match = valueText.match(/\((\d+)\)/);
                                if (match && match[1]) {
                                    value = match[1];
                                } else {
                                    value = valueText;
                                }
                            } else {
                                value = cells[3]?.textContent.trim() || '';
                            }
                        } catch (e) {
                            console.error(`Error extracting data for: ${keyword}`, e);
                        }
                        break;
                    }
                }
                
                const escapedKeyword = keyword.replace(/"/g, '""');
                tsv += `"${escapedKeyword}"\t${volume}\t${value}\n`;
            });
            
            // Direct DOM-based approach to ensure clipboard works without relying on navigator API
            try {
                const textarea = document.createElement('textarea');
                textarea.value = tsv;
                textarea.style.position = 'fixed';
                textarea.style.left = '0';
                textarea.style.top = '0';
                textarea.style.opacity = '0';
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                
                document.execCommand('copy');
                document.body.removeChild(textarea);
                
                // Success - show success UI
                showSuccessTick(elements.copyBtn, originalCopyBtn);
                
                // Try multiple approaches to show notification
                try {
                    // Approach 1: Direct global function
                    if (typeof showNotification === 'function') {
                        showNotification(`${filteredKeywords.length} keywords copied to clipboard`);
                    }
                    // Approach 2: Window object
                    else if (window && typeof window.showNotification === 'function') {
                        window.showNotification(`${filteredKeywords.length} keywords copied to clipboard`);
                    }
                    // Approach 3: Fallback alert
                    else {
                        setTimeout(() => {
                            alert(`${filteredKeywords.length} keywords copied to clipboard successfully!`);
                        }, 500);
                    }
                } catch (notifyError) {
                    console.warn("Could not show notification:", notifyError);
                    alert(`${filteredKeywords.length} keywords copied to clipboard`);
                }
            } catch (clipboardErr) {
                console.error("Clipboard operation failed:", clipboardErr);
                alert(`Error copying to clipboard. Please try again.`);
                
                // Reset button state
                if (elements.copyBtn) {
                    elements.copyBtn.innerHTML = originalCopyBtn;
                    elements.copyBtn.disabled = false;
                }
            }
        } catch (err) {
            console.error('Copy operation error:', err);
            alert('Error copying to clipboard: ' + err.message);
            
            // Reset button state as a last resort
            if (elements.copyBtn) {
                try {
                    const originalHTML = elements.copyBtn.getAttribute('data-original-html') || 'Copy Selected';
                    elements.copyBtn.innerHTML = originalHTML;
                    elements.copyBtn.disabled = false;
                } catch (e) {
                    // Absolute last resort
                    elements.copyBtn.innerHTML = 'Copy Selected';
                    elements.copyBtn.disabled = false;
                }
            }
        }
    }

    function updateSelectedCount() {
        // Filter out empty keywords from the count
        let validKeywords = 0;
        selectedKeywordsSet.forEach(kw => {
            if (kw && kw.trim() !== '') {
                validKeywords++;
            }
        });

        const count = validKeywords;

        // Update main table counter
        const tableCountElement = document.getElementById('selectedCount');
        const tableContainerElement = document.getElementById('selected-count-container');
        if (tableCountElement && tableContainerElement) {
            tableCountElement.textContent = count;
            tableContainerElement.style.display = count > 0 ? 'flex' : 'none';
        }

        // Update save modal counter
        const modalCountElement = document.getElementById('selected-keywords-count');
        if (modalCountElement) {
            modalCountElement.textContent = count;
        }
        
        // Also update any other count displays that might be in modals
        const saveModalCountElement = document.querySelector('.save-modal-count');
        if (saveModalCountElement) {
            saveModalCountElement.textContent = count;
        }
    }

    // Setup volume filter dropdown
    function setupVolumeFilter() {
        const filterBtn = document.getElementById('volume-filter-btn');
        const filterDropdown = document.getElementById('volume-filter-dropdown');
        
        if (!filterBtn || !filterDropdown) return;
        
        // Toggle dropdown visibility
        filterBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            filterDropdown.classList.toggle('hidden');
        });
        
        // Handle clicking on filter options
        const filterOptions = filterDropdown.querySelectorAll('.filter-option');
        filterOptions.forEach(option => {
            option.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                const label = this.textContent;
                
                // Update button label
                const btnLabel = filterBtn.querySelector('span');
                if (btnLabel) {
                    btnLabel.textContent = label;
                }
                
                // Hide dropdown
                filterDropdown.classList.add('hidden');
                
                // Apply filter to table (implement your filtering logic here)
                applyVolumeFilter(value);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!filterBtn.contains(e.target) && !filterDropdown.contains(e.target)) {
                filterDropdown.classList.add('hidden');
            }
        });
    }

    // Apply volume filter to saved keywords table
    function applyVolumeFilter(value) {
        const savedKeywordsTable = document.getElementById('savedKeywordsTableBody');
        if (!savedKeywordsTable) return;
        
        const rows = savedKeywordsTable.querySelectorAll('tr');
        
        rows.forEach(row => {
            const volumeCell = row.querySelector('td:nth-child(2)'); // Adjust index if needed
            if (!volumeCell) return;
            
            const volumeText = volumeCell.textContent.trim();
            
            // Show all rows if filter is 'all'
            if (value === 'all') {
                row.style.display = '';
                return;
            }
            
            // Filter logic based on volume ranges
            switch (value) {
                case 'blank':
                    row.style.display = volumeText === '' ? '' : 'none';
                    break;
                case '10k':
                    row.style.display = volumeText.includes('10K-') ? '' : 'none';
                    break;
                case '100k':
                    row.style.display = volumeText.includes('100K') ? '' : 'none';
                    break;
                case '100k-1m':
                    row.style.display = volumeText.includes('100K-1M') ? '' : 'none';
                    break;
                case '1m-10m':
                    row.style.display = volumeText.includes('1M-10M') ? '' : 'none';
                    break;
                default:
                    row.style.display = '';
            }
        });
    }

    // Reset all filters
    function resetFilters() {
        // Reset volume filter
        currentVolumeFilter = '';
        if (elements.volumeFilterLabel) {
            elements.volumeFilterLabel.textContent = 'All Volumes';
        }

        // Reset page size to default
        currentPageSize = 100;
        if (elements.mainPageSizeInput) {
            elements.mainPageSizeInput.value = 100;
        }

        // Clear search input
        if (elements.searchInput) {
            elements.searchInput.value = '';
            toggleClearButton();
        }
    }

    // Helper function to toggle clear button visibility
    function toggleClearButton() {
        if (!elements.searchInput || !elements.clearSearchBtn) return;

        if (elements.searchInput.value.trim() !== '') {
            elements.clearSearchBtn.classList.remove('hidden');
        } else {
            elements.clearSearchBtn.classList.add('hidden');
        }
    }

    // Handle table header sorting
    function handleSort(event) {
        const target = event.target.closest('.sortable');
        if (!target) return;

        const column = target.dataset.sort;
        if (!column) return;

        // Toggle order if clicking on the same column
        if (currentSort.column === column) {
            currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.column = column;
            currentSort.order = 'asc';
        }

        // Store sort preferences
        localStorage.setItem('keywordSort', JSON.stringify(currentSort));

        // Reload with new sort order
        loadKeywords(lastSearchTerm, 1);
    }

    // Helper function to update selection state and UI
    function updateSelection(box) {
      const kw = box.dataset.keyword;
      if (!kw || kw.trim() === '') {
        console.log('Skipping empty keyword');
        return; // Skip empty keywords
      }
      
      if (box.checked) {
        selectedKeywordsSet.add(kw);
      } else {
        selectedKeywordsSet.delete(kw);
      }
      updateSelectedCount();
      updateSelectAllCheckboxState();
      updateExportButtonState();
      updateCopyButtonState();
      updateSaveButtonState();
    }
    
    // Sync checkbox states with the global selectedKeywordsSet
    function updateCheckboxStates() {
        // Update all checkboxes based on the selectedKeywordsSet
        const checkboxes = document.querySelectorAll('#keywordsTableBody input[type="checkbox"][data-keyword]');
        
        checkboxes.forEach(checkbox => {
            const keyword = checkbox.dataset.keyword;
            const shouldBeChecked = selectedKeywordsSet.has(keyword);
            
            // Only update if the state needs to change
            if (checkbox.checked !== shouldBeChecked) {
                checkbox.checked = shouldBeChecked;
            }
        });
        
        // Update the "select all" checkbox state
        updateSelectAllCheckboxState();
        
        // Update button states
        updateExportButtonState();
        updateCopyButtonState();
        updateSaveButtonState();
        
        // Update count display
        updateSelectedCount();
    }

    // Function to reinitialize action buttons with fresh event handlers
    function reinitializeActionButtons() {
        // Handle Copy button
        if (elements.copyBtn) {
            // Store original HTML
            const originalCopyHTML = elements.copyBtn.innerHTML;
            elements.copyBtn.setAttribute('data-original-html', originalCopyHTML);
            
            // Clone to remove existing handlers
            const newCopyBtn = elements.copyBtn.cloneNode(true);
            elements.copyBtn.parentNode.replaceChild(newCopyBtn, elements.copyBtn);
            elements.copyBtn = newCopyBtn;
            
            // Add the correct event handler with error handling
            elements.copyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                try {
                    copySelected();
                } catch (err) {
                    console.error("Error in copy operation:", err);
                    alert("Failed to copy keywords: " + err.message);
                    
                    // Reset button state
                    this.innerHTML = this.getAttribute('data-original-html') || 'Copy Selected';
                    this.disabled = false;
                }
            });
        }
        
        // Handle Export button
        if (elements.exportBtn) {
            // Store original HTML
            const originalExportHTML = elements.exportBtn.innerHTML;
            elements.exportBtn.setAttribute('data-original-html', originalExportHTML);
            
            // Clone to remove existing handlers
            const newExportBtn = elements.exportBtn.cloneNode(true);
            elements.exportBtn.parentNode.replaceChild(newExportBtn, elements.exportBtn);
            elements.exportBtn = newExportBtn;
            
            // Add fresh event handler
            elements.exportBtn.addEventListener('click', function(e) {
                e.preventDefault();
                try {
                    exportSelected();
                } catch (err) {
                    console.error("Error in export operation:", err);
                    alert("Failed to export keywords: " + err.message);
                    
                    // Reset button state
                    this.innerHTML = this.getAttribute('data-original-html') || 'Export';
                    this.disabled = false;
                    this.classList.remove('opacity-70');
                }
            });
        }
        
        // Update button states
        updateExportButtonState();
        updateCopyButtonState();
        updateSaveButtonState();
    }

    // Monitor DOM for save dialog and update counts
    function setupSaveModalObserver() {
        // Create a MutationObserver to detect when the save modal is opened
        const observer = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.addedNodes.length) {
                    for (const node of mutation.addedNodes) {
                        // Check if this is our save modal
                        if (node.nodeType === 1 && (
                            node.id === 'save-keywords-modal' || 
                            node.classList && node.classList.contains('save-keywords-modal') ||
                            node.querySelector && node.querySelector('.save-to-list-header')
                        )) {
                            console.log('Save modal detected in DOM');
                            
                            // Find all keyword count elements in the dialog
                            const countElements = node.querySelectorAll('[class*="keywords-selected"], [class*="keywords-count"]');
                            
                            // Count valid keywords
                            let validKeywords = 0;
                            selectedKeywordsSet.forEach(kw => {
                                if (kw && kw.trim() !== '') {
                                    validKeywords++;
                                }
                            });
                            
                            // Update all count elements found
                            countElements.forEach(el => {
                                el.textContent = validKeywords;
                                console.log(`Updated count element to ${validKeywords}`);
                            });
                            
                            // For direct inner text that might contain the count
                            const allElements = node.querySelectorAll('*');
                            allElements.forEach(el => {
                                if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
                                    const text = el.textContent;
                                    if (text && text.includes('keywords selected')) {
                                        el.textContent = `${validKeywords} keywords selected`;
                                        console.log(`Updated text content to "${validKeywords} keywords selected"`);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        });
        
        // Start observing the document with the configured parameters
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Also handle existing save button if present
        const saveBtn = document.querySelector('#save-selected-btn, [data-action="save-selected"]');
        if (saveBtn) {
            saveBtn.addEventListener('click', function() {
                // Small delay to let the modal open
                setTimeout(() => {
                    // Find the modal that appeared
                    const modal = document.querySelector('.modal, .save-modal, #save-keywords-modal, [class*="save-keywords"]');
                    if (modal) {
                        // Count valid keywords
                        let validKeywords = 0;
                        selectedKeywordsSet.forEach(kw => {
                            if (kw && kw.trim() !== '') {
                                validKeywords++;
                            }
                        });
                        
                        // Update all potential count elements
                        const countElements = modal.querySelectorAll('*');
                        countElements.forEach(el => {
                            if (el.childNodes.length === 1 && el.firstChild.nodeType === 3) {
                                const text = el.textContent;
                                if (text && text.includes('keywords selected')) {
                                    el.textContent = `${validKeywords} keywords selected`;
                                }
                            }
                        });
                    }
                }, 100);
            });
        }
    }

    // Optimized table rendering for large datasets
    function renderLargeTable(data, tbody, options = {}) {
        // Default options
        const defaults = {
            rowHeight: 40, // Approximate height of each row in pixels
            batchSize: 50, // Number of rows to render in each batch
            totalHeight: 400, // Visible container height
            renderDelay: 10 // Millisecond delay between batches
        };
        
        // Merge default options with provided options
        const settings = {...defaults, ...options};
        
        // Clear the table
        tbody.innerHTML = '';
        
        // If no data, show empty state
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="py-6 text-center">
                        <div class="flex flex-col items-center gap-3 py-6">
                            <div class="p-3 rounded-full bg-slate-100">
                                <i class="fas fa-database text-slate-400 text-xl"></i>
                            </div>
                            <div class="text-center">
                                <p class="text-slate-700 font-medium">No data available</p>
                            </div>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        // For very large datasets, consider using virtualization
        if (data.length > 1000) {
            // Create a container with fixed height
            const visibleRowCount = Math.ceil(settings.totalHeight / settings.rowHeight);
            const totalHeight = data.length * settings.rowHeight;
            
            // Add a spacer row to represent the total height
            const spacerRow = document.createElement('tr');
            spacerRow.style.height = `${totalHeight}px`;
            spacerRow.style.display = 'block';
            tbody.appendChild(spacerRow);
            
            // Add scroll event listener to the table container
            const tableContainer = tbody.closest('.table-container');
            if (tableContainer) {
                tableContainer.addEventListener('scroll', function() {
                    const scrollTop = this.scrollTop;
                    const startIndex = Math.floor(scrollTop / settings.rowHeight);
                    const endIndex = Math.min(startIndex + visibleRowCount + 5, data.length);
                    
                    // Only render visible rows
                    renderVisibleRows(data.slice(startIndex, endIndex), startIndex);
                });
                
                // Initial render of visible rows
                renderVisibleRows(data.slice(0, visibleRowCount + 5), 0);
            } else {
                // If no container found, fall back to batch rendering
                renderInBatches(data, 0);
            }
        } else {
            // For smaller datasets, render in batches for better performance
            renderInBatches(data, 0);
        }
        
        // Function to render only visible rows (for virtualization)
        function renderVisibleRows(visibleData, startIndex) {
            // Clear existing rows except spacer
            const rows = tbody.querySelectorAll('tr:not(:last-child)');
            rows.forEach(row => row.remove());
            
            // Create fragment for batch DOM updates
            const fragment = document.createDocumentFragment();
            
            // Render only the visible rows
            visibleData.forEach((item, index) => {
                const actualIndex = startIndex + index;
                const row = createRow(item, actualIndex);
                
                // Position the row absolutely
                row.style.position = 'absolute';
                row.style.top = `${actualIndex * settings.rowHeight}px`;
                row.style.width = '100%';
                
                fragment.appendChild(row);
            });
            
            // Insert all rows at once
            tbody.appendChild(fragment);
        }
        
        // Function to render data in batches
        function renderInBatches(remainingData, processedCount) {
            // Create fragment for batch DOM updates
            const fragment = document.createDocumentFragment();
            
            // Process a batch
            const batch = remainingData.slice(0, settings.batchSize);
            batch.forEach((item, index) => {
                const row = createRow(item, processedCount + index);
                fragment.appendChild(row);
            });
            
            // Append batch to the table
            tbody.appendChild(fragment);
            
            // If there's more data, schedule the next batch
            const remaining = remainingData.slice(settings.batchSize);
            if (remaining.length > 0) {
                setTimeout(() => {
                    renderInBatches(remaining, processedCount + settings.batchSize);
                }, settings.renderDelay);
            }
        }
        
        // Function to create a single row
        function createRow(item, index) {
            if (!item) return null;
            
            const tr = document.createElement('tr');
            tr.className = `table-row ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`;
            
            // Generate row HTML based on data structure
            // This is a simplified example - adapt to your actual data structure
            tr.innerHTML = `
                <td class="col-checkbox text-center">
                    <input type="checkbox" class="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        ${item.selected ? 'checked' : ''}>
                </td>
                <td class="text-sm">${item.name || ''}</td>
                <td class="text-sm">${item.value1 || ''}</td>
                <td class="text-sm">${item.value2 || ''}</td>
            `;
            
            return tr;
        }
    }
    
    // Memory management - clean up event listeners when switching views
    function cleanUpEventListeners() {
        // Clean up pagination listeners
        const paginationContainer = elements.paginationContainer;
        if (paginationContainer) {
            const clone = paginationContainer.cloneNode(true);
            if (paginationContainer.parentNode) {
                paginationContainer.parentNode.replaceChild(clone, paginationContainer);
                elements.paginationContainer = clone;
            }
        }
        
        // Clean up table listeners using event delegation where possible
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            tableContainer.removeEventListener('scroll', null);
        }
    }
    
    // Browser performance optimizations
    function optimizeForPerformance() {
        // Use requestAnimationFrame for smoother UI animations
        const scrollContainers = document.querySelectorAll('.table-container, #project-file-list, #saved-keyword-lists');
        scrollContainers.forEach(container => {
            container.addEventListener('scroll', function() {
                // Use requestAnimationFrame to avoid scroll jank
                if (!this.dataset.isScrolling) {
                    this.dataset.isScrolling = true;
                    window.requestAnimationFrame(() => {
                        // Add any scroll-related UI updates here
                        this.dataset.isScrolling = false;
                    });
                }
            });
        });
        
        // Add passive event listeners for better scroll performance on touch devices
        document.addEventListener('touchstart', function() {}, {passive: true});
        
        // Optimize images if present
        document.querySelectorAll('img').forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', function() {
                    this.classList.add('opacity-100');
                    this.classList.remove('opacity-0');
                });
                
                // Add loading="lazy" for images below the fold
                if (!isInViewport(img)) {
                    img.setAttribute('loading', 'lazy');
                }
            }
        });
        
        // Helper function to check if element is in viewport
        function isInViewport(element) {
            const rect = element.getBoundingClientRect();
            return (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= window.innerHeight &&
                rect.right <= window.innerWidth
            );
        }
    }
    
    // Call performance optimizations on load
    optimizeForPerformance();

    // Call these functions on document ready
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize sidebars with toggle functionality
        initializeSidebar();
        
        // Apply responsive fixes for mobile devices
        applyMobileOptimizations();
        
        // Add automatic cleanup for memory management
        setupMemoryManagement();
        
        console.log('KeywordPlanner UI optimizations initialized');
    });

    // Initialize sidebar functionality
    function initializeSidebar() {
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const contentArea = document.getElementById('content-area');
        const sidebarCollapse = document.getElementById('sidebar-collapse');
        const collapseIcon = document.getElementById('collapse-icon');

        // Toggle sidebar on mobile
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.add('open');
                sidebarOverlay.classList.remove('hidden');
                document.body.classList.add('overflow-hidden'); // Prevent scrolling
            });
        }

        // Close sidebar on mobile
        if (sidebarClose) {
            sidebarClose.addEventListener('click', function() {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            });
        }

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', function() {
                sidebar.classList.remove('open');
                sidebarOverlay.classList.add('hidden');
                document.body.classList.remove('overflow-hidden');
            });
        }

        // Collapse sidebar on desktop
        if (sidebarCollapse) {
            sidebarCollapse.addEventListener('click', function() {
                sidebar.classList.toggle('sidebar-collapsed');
                
                if (sidebar.classList.contains('sidebar-collapsed')) {
                    contentArea.classList.remove('lg:ml-[240px]');
                    contentArea.classList.add('lg:ml-[60px]');
                    collapseIcon.classList.remove('fa-chevron-left');
                    collapseIcon.classList.add('fa-chevron-right');
                } else {
                    contentArea.classList.remove('lg:ml-[60px]');
                    contentArea.classList.add('lg:ml-[240px]');
                    collapseIcon.classList.remove('fa-chevron-right');
                    collapseIcon.classList.add('fa-chevron-left');
                }
                
                // Toggle visibility of text
                document.querySelectorAll('.sidebar-menu-item span, .sidebar h5, .sidebar-section-header').forEach(el => {
                    el.classList.toggle('hidden');
                });
            });
        }
    }

    // Apply optimizations specifically for mobile
    function applyMobileOptimizations() {
        // Check if device is mobile
        const isMobile = window.innerWidth < 768;
        
        if (isMobile) {
            // Make table headers sticky with higher z-index
            document.querySelectorAll('.table-header').forEach(header => {
                header.style.zIndex = '20';
                header.style.position = 'sticky';
                header.style.top = '0';
            });
            
            // Add touch-friendly padding to clickable elements
            document.querySelectorAll('button, a, input[type="checkbox"], select').forEach(el => {
                if (el.clientWidth < 40 || el.clientHeight < 40) {
                    el.classList.add('touch-target');
                }
            });
            
            // Optimize image sizes for mobile
            document.querySelectorAll('img').forEach(img => {
                if (!img.hasAttribute('srcset') && img.src) {
                    // Add loading="lazy" to all images below the fold
                    img.setAttribute('loading', 'lazy');
                }
            });
        }
    }

    // Setup memory management to prevent memory leaks
    function setupMemoryManagement() {
        // Clean up event listeners when switching views
        document.querySelectorAll('#main-table-view, #saved-keywords-view').forEach(tab => {
            tab.addEventListener('click', cleanUpEventListeners);
        });
        
        // Periodically check for detached DOM elements
        let memoryCheckInterval;
        if (window.performance && window.performance.memory) {
            memoryCheckInterval = setInterval(() => {
                const memoryInfo = window.performance.memory;
                if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
                    console.warn('High memory usage detected - cleaning up resources');
                    cleanUpEventListeners();
                    
                    // Force garbage collection if possible
                    if (window.gc) {
                        try {
                            window.gc();
                        } catch (e) {
                            console.log('Manual garbage collection failed');
                        }
                    }
                }
            }, 30000); // Check every 30 seconds
        }
        
        // Clean up interval on page unload
        window.addEventListener('beforeunload', () => {
            if (memoryCheckInterval) {
                clearInterval(memoryCheckInterval);
            }
        });
    }

    // Initialize dark mode and apply current settings
    function initializeDarkMode() {
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (!darkModeToggle) return;
        
        // Check localStorage for user preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Apply initial state
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            
            // Force update text colors for dark mode
            document.querySelectorAll('th, td').forEach(el => {
                el.style.color = '#f1f5f9';
            });
            document.querySelectorAll('.text-slate-700, .text-slate-800, .text-slate-900').forEach(el => {
                el.style.color = '#f1f5f9';
            });
        } else {
            document.body.classList.remove('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
            
            // Reset text colors for light mode
            document.querySelectorAll('th, td').forEach(el => {
                el.style.color = '';
            });
            document.querySelectorAll('.text-slate-700, .text-slate-800, .text-slate-900').forEach(el => {
                el.style.color = '';
            });
        }
        
        // Create direct click handler that doesn't rely on event bubbling
        darkModeToggle.onclick = function() {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            // Update icon
            this.innerHTML = isDark 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
            
            // Force update text colors for dark mode
            if (isDark) {
                document.querySelectorAll('th, td').forEach(el => {
                    el.style.color = '#f1f5f9';
                });
                document.querySelectorAll('.text-slate-700, .text-slate-800, .text-slate-900').forEach(el => {
                    el.style.color = '#f1f5f9';
                });
            } else {
                // Properly reset all text colors for light mode
                document.querySelectorAll('th, td').forEach(el => {
                    el.style.color = '';
                });
                document.querySelectorAll('.text-slate-700, .text-slate-800, .text-slate-900').forEach(el => {
                    el.style.color = '';
                });
                
                // Specifically reset keyword column text to proper dark color
                document.querySelectorAll('td.text-sm.font-medium.text-slate-900').forEach(el => {
                    el.style.color = '#1e293b';
                });
            }
            
            // Update theme color for mobile browsers
            const metaThemeColor = document.querySelector('meta[name="theme-color"]');
            if (metaThemeColor) {
                metaThemeColor.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
            }
        };
    }

    // Add this function to ensure KD column is properly aligned and sort icon shows
    function fixKDColumnAlignment() {
        // Fix main table KD column header
        const mainKDHeader = document.querySelector('#main-table-content th[data-sort="value"]');
        if (mainKDHeader) {
            mainKDHeader.style.textAlign = 'center';
            
            // Ensure the inner span has proper classes for flex alignment
            const span = mainKDHeader.querySelector('span');
            if (span) {
                span.className = 'flex items-center justify-center';
                
                // Make sure the KD text appears
                const textSpan = span.querySelector('span');
                if (textSpan && textSpan.textContent !== 'KD') {
                    textSpan.textContent = 'KD';
                    textSpan.className = 'font-semibold text-slate-700';
                }
                
                // Make sure the sort icon appears
                const icon = span.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sort ml-2 text-slate-400 text-xs';
                    icon.style.display = 'inline-block';
                    icon.style.visibility = 'visible';
                } else {
                    // Create icon if missing
                    const newIcon = document.createElement('i');
                    newIcon.className = 'fas fa-sort ml-2 text-slate-400 text-xs';
                    newIcon.style.display = 'inline-block';
                    newIcon.style.visibility = 'visible';
                    span.appendChild(newIcon);
                }
            }
        }
        
        // Fix saved keywords KD column header
        const savedKDHeader = document.querySelector('#active-list-content th[data-sort="value"]');
        if (savedKDHeader) {
            savedKDHeader.style.textAlign = 'center';
            
            // Ensure the inner span has proper classes for flex alignment
            const span = savedKDHeader.querySelector('span');
            if (span) {
                span.className = 'flex items-center justify-center';
                
                // Make sure the KD text appears
                const textSpan = span.querySelector('span');
                if (textSpan && textSpan.textContent !== 'KD') {
                    textSpan.textContent = 'KD';
                }
                
                // Make sure the sort icon appears
                const icon = span.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sort ml-2 text-slate-400';
                    icon.style.display = 'inline-block';
                    icon.style.visibility = 'visible';
                } else {
                    // Create icon if missing
                    const newIcon = document.createElement('i');
                    newIcon.className = 'fas fa-sort ml-2 text-slate-400';
                    newIcon.style.display = 'inline-block';
                    newIcon.style.visibility = 'visible';
                    span.appendChild(newIcon);
                }
            }
        }
        
        // Fix values alignment in KD column
        document.querySelectorAll('#savedKeywordsTableBody td:nth-child(4)').forEach(cell => {
            cell.style.textAlign = 'center';
            cell.style.padding = '0.625rem 1.5rem';
            cell.style.fontWeight = '500';
        });
    }

    // Call the function after page load and after any display updates
    document.addEventListener('DOMContentLoaded', () => {
        // Original initialization code...
        initializeDarkMode();
        
        // Add the KD column fix
        fixKDColumnAlignment();
        
        // Set interval to check and fix KD column periodically
        setInterval(fixKDColumnAlignment, 500);
        
        // Initialize volume filter dropdowns
        setupVolumeFilter();
        
        // Initialize All Volumes dropdown
        setupAllVolumesDropdown();
        
        // Rest of the existing code...
    });

    // Function to toggle modals
    function toggleModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        if (modal.classList.contains('hidden')) {
            // Show modal
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent scrolling
        } else {
            // Hide modal
            modal.classList.add('hidden');
            document.body.style.overflow = ''; // Re-enable scrolling
        }
    }

    // Function to rename project
    function renameProject() {
        const newProjectName = document.getElementById('new-project-name').value.trim();
        if (!newProjectName) return;
        
        // Get current active project
        const activeProject = document.querySelector('.project-item.active');
        if (activeProject) {
            // Update project name in UI
            const projectName = activeProject.querySelector('.project-name');
            if (projectName) {
                projectName.textContent = newProjectName;
            }
        }
        
        // Close modal
        toggleModal('rename-project-modal');
    }

    // Add event listeners for modal toggles
    document.addEventListener('DOMContentLoaded', function() {
        // Project rename modal
        const renameButtons = document.querySelectorAll('.rename-project-btn');
        renameButtons.forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                toggleModal('rename-project-modal');
            });
        });
    });

    // Setup modal and button functionality
    document.addEventListener('DOMContentLoaded', function() {
        // Project rename modal buttons
        const renameProjectBtn = document.getElementById('rename-project-btn');
        const renameProjectModal = document.getElementById('rename-project-modal');
        const closeRenameModal = document.getElementById('close-rename-project-modal');
        const cancelRenameProject = document.getElementById('cancel-rename-project');
        const confirmRenameProject = document.getElementById('confirm-rename-project');
        const newProjectNameInput = document.getElementById('new-project-name');
        
        // Create project modal buttons
        const createProjectBtn = document.getElementById('create-project-btn');
        const createProjectModal = document.getElementById('create-project-modal');
        const closeProjectModal = document.getElementById('close-project-modal');
        const cancelCreateProject = document.getElementById('cancel-create-project');
        const confirmCreateProject = document.getElementById('confirm-create-project');
        const projectNameInput = document.getElementById('project-name');
        
        // Functions to show/hide modals
        function showModal(modal) {
            if (modal) {
                modal.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Prevent scrolling
            }
        }
        
        function hideModal(modal) {
            if (modal) {
                modal.classList.add('hidden');
                document.body.style.overflow = ''; // Re-enable scrolling
            }
        }
        
        // Project Rename Modal
        if (renameProjectBtn) {
            renameProjectBtn.addEventListener('click', function() {
                // Reset input field and show modal
                if (newProjectNameInput) {
                    const currentProject = document.querySelector('.project-name').textContent;
                    newProjectNameInput.value = currentProject || '';
                    newProjectNameInput.focus();
                }
                showModal(renameProjectModal);
            });
        }
        
        // Close rename modal buttons
        if (closeRenameModal) {
            closeRenameModal.addEventListener('click', function() {
                hideModal(renameProjectModal);
            });
        }
        
        if (cancelRenameProject) {
            cancelRenameProject.addEventListener('click', function() {
                hideModal(renameProjectModal);
            });
        }
        
        // Confirm rename project
        if (confirmRenameProject) {
            confirmRenameProject.addEventListener('click', function() {
                if (newProjectNameInput && newProjectNameInput.value.trim() !== '') {
                    const newName = newProjectNameInput.value.trim();
                    // Update project name in the UI
                    const projectNameElements = document.querySelectorAll('.project-name');
                    projectNameElements.forEach(el => {
                        el.textContent = newName;
                    });
                    
                    // TODO: Add API call to save project name change
                    
                    // Close modal
                    hideModal(renameProjectModal);
                }
            });
        }
        
        // Create Project Modal
        if (createProjectBtn) {
            createProjectBtn.addEventListener('click', function() {
                // Reset input field and show modal
                if (projectNameInput) {
                    projectNameInput.value = '';
                    projectNameInput.focus();
                }
                showModal(createProjectModal);
            });
        }
        
        // Close create project modal buttons
        if (closeProjectModal) {
            closeProjectModal.addEventListener('click', function() {
                hideModal(createProjectModal);
            });
        }
        
        if (cancelCreateProject) {
            cancelCreateProject.addEventListener('click', function() {
                hideModal(createProjectModal);
            });
        }
        
        // Confirm create project
        if (confirmCreateProject) {
            confirmCreateProject.addEventListener('click', function() {
                if (projectNameInput && projectNameInput.value.trim() !== '') {
                    const projectName = projectNameInput.value.trim();
                    // TODO: Add API call to create new project
                    
                    // Update UI with new project (simplified example)
                    const projectSelector = document.getElementById('project-selector');
                    if (projectSelector) {
                        const option = document.createElement('option');
                        option.value = projectName.toLowerCase().replace(/\s+/g, '-');
                        option.textContent = projectName;
                        option.selected = true;
                        projectSelector.appendChild(option);
                    }
                    
                    // Close modal
                    hideModal(createProjectModal);
                }
            });
        }
        
        // Close modals when clicking outside
        window.addEventListener('click', function(event) {
            if (renameProjectModal && event.target === renameProjectModal) {
                hideModal(renameProjectModal);
            }
            if (createProjectModal && event.target === createProjectModal) {
                hideModal(createProjectModal);
            }
        });
    });

    // Enhanced function to fix volume filter dropdown issues
    function setupVolumeFilter() {
        // Main volume filter
        setupVolumeFilterDropdown('main-volume-filter-btn', 'main-volume-filter-dropdown', 'main-volume-filter-label');
        
        // Saved keywords volume filter
        setupVolumeFilterDropdown('volume-filter-btn', 'volume-filter-dropdown', 'volume-filter-label');
        
        function setupVolumeFilterDropdown(buttonId, dropdownId, labelId) {
            const button = document.getElementById(buttonId);
            const dropdown = document.getElementById(dropdownId);
            const label = document.getElementById(labelId);
            
            if (!button || !dropdown) {
                console.warn(`Volume filter elements not found: ${buttonId}, ${dropdownId}`);
                return;
            }
            
            console.log(`Setting up volume filter dropdown: ${buttonId}, ${dropdownId}, ${labelId}`);
            
            // Ensure proper default state
            dropdown.classList.add('hidden');
            
            // Toggle dropdown on button click
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Toggle visibility
                dropdown.classList.toggle('hidden');
                
                // Force display property based on hidden class
                if (dropdown.classList.contains('hidden')) {
                    dropdown.style.display = 'none';
                } else {
                    dropdown.style.display = 'block';
                    console.log(`Dropdown ${dropdownId} is now visible`);
                }
            });
            
            // Handle option selection
            const options = dropdown.querySelectorAll('.filter-option');
            if (options.length === 0) {
                console.warn(`No filter options found in dropdown: ${dropdownId}`);
            }
            
            options.forEach(option => {
                option.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const filterValue = this.getAttribute('data-filter') || '';
                    const filterText = this.textContent.trim();
                    
                    console.log(`Filter option clicked: ${filterText}, value: ${filterValue}`);
                    
                    // Update button label
                    if (label) {
                        label.textContent = filterText;
                        console.log(`Updated label ${labelId} to ${filterText}`);
                    } else if (button.querySelector('span')) {
                        button.querySelector('span').textContent = filterText;
                        console.log(`Updated button span to ${filterText}`);
                    }
                    
                    // Hide dropdown
                    dropdown.classList.add('hidden');
                    dropdown.style.display = 'none';
                    
                    // Apply different filter handling based on which dropdown was used
                    if (buttonId === 'main-volume-filter-btn') {
                        // For main table
                        if (typeof currentVolumeFilter !== 'undefined') {
                            currentVolumeFilter = filterValue;
                            window.currentVolumeFilter = filterValue;
                            if (typeof loadKeywords === 'function') {
                                const searchInput = document.getElementById('searchInput');
                                loadKeywords(searchInput?.value.trim() || '', 1);
                            }
                        }
                    } else {
                        // For saved keywords table
                        if (typeof applyVolumeFilter === 'function') {
                            applyVolumeFilter(filterValue);
                        }
                    }
                });
            });
            
            // Close dropdown when clicking outside
            document.addEventListener('click', function(e) {
                if (!button.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                    dropdown.style.display = 'none';
                }
            });
        }
    }

    // Apply volume filter to saved keywords table
    function applyVolumeFilter(value) {
        const savedKeywordsTable = document.getElementById('savedKeywordsTableBody');
        if (!savedKeywordsTable) return;
        
        const rows = savedKeywordsTable.querySelectorAll('tr');
        
        rows.forEach(row => {
            const volumeCell = row.querySelector('td:nth-child(3)'); // Adjust index if needed - volume is usually 3rd column
            if (!volumeCell) return;
            
            const volumeText = volumeCell.textContent.trim();
            
            // Show all rows if filter is 'all' or empty
            if (!value || value === 'all' || value === '') {
                row.style.display = '';
                return;
            }
            
            // Filter logic based on volume ranges
            switch (value) {
                case 'blank':
                    row.style.display = (volumeText === '' || volumeText === 'N/A') ? '' : 'none';
                    break;
                case '10k':
                case '10K-100K':
                    row.style.display = volumeText.includes('10K') ? '' : 'none';
                    break;
                case '100k':
                case '100K':
                    row.style.display = volumeText.includes('100K') ? '' : 'none';
                    break;
                case '100k-1m':
                case '100K-1M':
                    row.style.display = volumeText.includes('100K-1M') ? '' : 'none';
                    break;
                case '1m-10m':
                case '1M-10M':
                    row.style.display = volumeText.includes('1M-10M') ? '' : 'none';
                    break;
                default:
                    row.style.display = '';
            }
        });
    }

    // Fix for Create New List button
    document.addEventListener('DOMContentLoaded', function() {
        // Setup Create New List button
        const createNewListBtn = document.getElementById('create-new-list');
        const createListModal = document.getElementById('create-list-modal');
        
        if (createNewListBtn && createListModal) {
            createNewListBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Show create list modal
                createListModal.classList.remove('hidden');
                
                // Focus on input field
                const listNameInput = document.getElementById('list-name');
                if (listNameInput) {
                    listNameInput.value = '';
                    listNameInput.focus();
                }
            });
        }
    });

    // Setup All Volumes dropdown functionality
    function setupAllVolumesDropdown() {
        const allVolumesBtn = document.getElementById('all-volumes-btn');
        const allVolumesDropdown = document.getElementById('all-volumes-dropdown');
        
        if (!allVolumesBtn || !allVolumesDropdown) return;
        
        // Toggle dropdown visibility when button is clicked
        allVolumesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            allVolumesDropdown.classList.toggle('hidden');
        });
        
        // Handle option selection
        const volumeOptions = allVolumesDropdown.querySelectorAll('.volume-option');
        volumeOptions.forEach(option => {
            option.addEventListener('click', function() {
                const value = this.getAttribute('data-value');
                const label = this.textContent.trim();
                
                // Update button text
                const btnText = allVolumesBtn.querySelector('span');
                if (btnText) {
                    btnText.textContent = label;
                }
                
                // Hide dropdown
                allVolumesDropdown.classList.add('hidden');
                
                // Apply filter
                applyVolumeFilter(value);
            });
        });
        
        // Close dropdown when clicking elsewhere
        document.addEventListener('click', function(e) {
            if (!allVolumesBtn.contains(e.target) && !allVolumesDropdown.contains(e.target)) {
                allVolumesDropdown.classList.add('hidden');
            }
        });
    }

    // Initialize project modals
    setupProjectModals();

    // Setup Project Modals
    function setupProjectModals() {
        // Project creation modal elements
        const createProjectBtn = document.getElementById('create-project-btn');
        const createProjectModal = document.getElementById('create-project-modal');
        const closeCreateModal = document.getElementById('close-create-modal');
        const cancelCreateProject = document.getElementById('cancel-create-project');
        const confirmCreateProject = document.getElementById('confirm-create-project');
        const projectNameInput = document.getElementById('project-name');
        
        // Project rename modal elements
        const renameProjectBtn = document.getElementById('rename-project-btn');
        const renameProjectModal = document.getElementById('rename-project-modal');
        const closeRenameModal = document.getElementById('close-rename-modal');
        const cancelRenameProject = document.getElementById('cancel-rename-project');
        const confirmRenameProject = document.getElementById('confirm-rename-project');
        const newProjectNameInput = document.getElementById('new-project-name');
        
        // Only proceed if we found the elements
        if (createProjectBtn && createProjectModal) {
            // Show create project modal
            createProjectBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                if (projectNameInput) {
                    projectNameInput.value = '';
                }
                createProjectModal.classList.remove('hidden');
            });
            
            // Close create project modal
            if (closeCreateModal) {
                closeCreateModal.addEventListener('click', function() {
                    createProjectModal.classList.add('hidden');
                });
            }
            
            // Cancel create project
            if (cancelCreateProject) {
                cancelCreateProject.addEventListener('click', function() {
                    createProjectModal.classList.add('hidden');
                });
            }
            
            // Create project on confirm
            if (confirmCreateProject && projectNameInput) {
                confirmCreateProject.addEventListener('click', function() {
                    const projectName = projectNameInput.value.trim();
                    if (projectName) {
                        // Call project creation function if it exists
                        if (typeof window.projectManager !== 'undefined' && 
                            typeof window.projectManager.createProject === 'function') {
                            window.projectManager.createProject(projectName);
                        } else {
                            // Fallback if project manager isn't available
                            console.log('Creating project:', projectName);
                            // Add project to selector
                            const projectSelector = document.getElementById('project-selector');
                            if (projectSelector) {
                                const option = document.createElement('option');
                                option.value = projectName.toLowerCase().replace(/\s+/g, '-');
                                option.textContent = projectName;
                                projectSelector.appendChild(option);
                                projectSelector.value = option.value;
                            }
                            showNotification(`Project "${projectName}" created`);
                        }
                        createProjectModal.classList.add('hidden');
                    } else {
                        alert('Please enter a project name');
                    }
                });
                
                // Handle Enter key in project name input
                projectNameInput.addEventListener('keyup', function(e) {
                    if (e.key === 'Enter') {
                        confirmCreateProject.click();
                    }
                });
            }
        }
        
        // Setup rename project modal if elements exist
        if (renameProjectBtn && renameProjectModal) {
            // Show rename project modal
            renameProjectBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get current project name
                const projectSelector = document.getElementById('project-selector');
                if (projectSelector && newProjectNameInput) {
                    const currentProject = projectSelector.options[projectSelector.selectedIndex]?.textContent || '';
                    newProjectNameInput.value = currentProject;
                }
                
                renameProjectModal.classList.remove('hidden');
            });
            
            // Close rename project modal
            if (closeRenameModal) {
                closeRenameModal.addEventListener('click', function() {
                    renameProjectModal.classList.add('hidden');
                });
            }
            
            // Cancel rename project
            if (cancelRenameProject) {
                cancelRenameProject.addEventListener('click', function() {
                    renameProjectModal.classList.add('hidden');
                });
            }
            
            // Rename project on confirm
            if (confirmRenameProject && newProjectNameInput) {
                confirmRenameProject.addEventListener('click', function() {
                    const newName = newProjectNameInput.value.trim();
                    if (newName) {
                        // Call project rename function if it exists
                        if (typeof window.projectManager !== 'undefined' && 
                            typeof window.projectManager.renameProject === 'function') {
                            window.projectManager.renameProject(newName);
                        } else {
                            // Fallback if project manager isn't available
                            const projectSelector = document.getElementById('project-selector');
                            if (projectSelector && projectSelector.selectedIndex >= 0) {
                                projectSelector.options[projectSelector.selectedIndex].textContent = newName;
                                showNotification(`Project renamed to "${newName}"`);
                            }
                        }
                        renameProjectModal.classList.add('hidden');
                    } else {
                        alert('Please enter a project name');
                    }
                });
                
                // Handle Enter key in rename input
                newProjectNameInput.addEventListener('keyup', function(e) {
                    if (e.key === 'Enter') {
                        confirmRenameProject.click();
                    }
                });
            }
        }
    }
});
