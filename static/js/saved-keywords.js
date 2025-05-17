/**
 * Saved Keywords Module
 * Handles all functionality related to saved keyword lists management
 */

// Saved Keywords Module
const SavedKeywords = (function() {
    // State
    let state = {
        lists: {},
        activeListId: null,
        pagination: {
            currentPage: 1,
            itemsPerPage: 50
        },
        volumeFilter: '', // Track current volume filter
        searchQuery: '' // Track current search query
    };

    // DOM element cache
    const elements = {};

    // Current sort state
    let currentSort = {
        column: 'keyword',
        order: 'asc'
    };

    // Initialize the module
    function init() {
        console.log("Initializing SavedKeywords module...");
        
        // Load saved data from backend instead of localStorage
        fetchSavedLists();
        
        // Still use localStorage for pagination and active list settings
        state.activeListId = localStorage.getItem('activeListId') || null;

        // Load pagination settings
        const savedPagination = JSON.parse(localStorage.getItem('savedKeywordsPagination'));
        if (savedPagination) {
            state.pagination = savedPagination;
        }

        // Cache DOM elements
        cacheElements();

        // Log any missing critical elements
        const criticalElements = ['saved-keywords-view', 'main-table-content', 'saved-keywords-content'];
        criticalElements.forEach(id => {
            if (!elements[id]) {
                console.error(`Missing critical element with ID: ${id}`);
            }
        });

        // Reduce column spacing in table headers
        adjustTableHeaderSpacing();

        // Set up event listeners
        setupEventListeners();

        console.log("SavedKeywords module initialized successfully");
    }
    
    // Fetch saved lists from the backend
    function fetchSavedLists() {
        fetch('/api/saved-lists')
            .then(response => response.json())
            .then(data => {
                // Convert the response to our state format
                const lists = {};
                
                // Check if there are any lists returned from the backend
                if (data.lists && data.lists.length > 0) {
                    data.lists.forEach(list => {
                        lists[list.name] = {
                            name: list.name,
                            count: list.count,
                            keywords: [] // We'll fetch these when needed
                        };
                    });
                } else {
                    // If backend returns no lists, clear localStorage to prevent stale UI
                    localStorage.removeItem('activeListId');
                    localStorage.removeItem('savedKeywordLists');
                    console.log("No saved lists found in backend");
                }
                
                state.lists = lists;
                
                // Update UI
                updateSavedKeywordListsSidebar();
                updateSavedKeywordsView();
                
                // Also update the saved-keyword-lists-container in the sidebar
                updateSavedKeywordListsContainer();
            })
            .catch(error => {
                console.error('Error fetching saved lists:', error);
            });
    }
    
    // Fetch a specific saved list from the backend
    function fetchSavedList(listName) {
        fetch(`/api/saved-list?name=${encodeURIComponent(listName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    console.error('Error fetching list:', data.error);
                    return;
                }
                
                // Update our state with the fetched keywords
                if (!state.lists[listName]) {
                    state.lists[listName] = {
                        name: listName,
                        keywords: []
                    };
                }
                
                // Convert the response format to our state format
                const keywords = data.keywords.map(kw => ({
                    keyword: kw.keyword,
                    volume: kw.volume,
                    value: kw.value
                }));
                
                state.lists[listName].keywords = keywords;
                
                // Update UI to show the loaded keywords
                updateActiveListContent();
            })
            .catch(error => {
                console.error('Error fetching saved list:', error);
            });
    }

    // Cache all DOM elements
    function cacheElements() {
        const ids = [
            // Views
            'main-table-view', 'saved-keywords-view', 'main-table-content', 'saved-keywords-content',
            // Buttons
            'save-selected-btn', 'create-list-btn', 'create-new-list',
            // Create list modal
            'create-list-modal', 'close-modal', 'cancel-create-list', 'confirm-create-list', 'list-name',
            // Save to list modal
            'save-to-list-modal', 'close-save-modal', 'cancel-save-to-list', 'confirm-save-to-list',
            'existing-lists', 'new-list-name', 'selected-keywords-count',
            // Saved keywords view elements
            'no-saved-lists', 'saved-lists-content', 'keyword-list-tabs', 'active-list-name',
            'active-list-count', 'edit-list-name', 'export-list', 'delete-list',
            'savedKeywordsTableBody', 'selectAllSaved', 'keywords-pagination',
            // Rename list modal
            'rename-list-modal', 'close-rename-modal', 'cancel-rename-list',
            'confirm-rename-list', 'rename-list-input',
            // Delete list modal
            'delete-list-modal', 'close-delete-modal', 'cancel-delete-list',
            'confirm-delete-list', 'delete-list-name', 'delete-list-count',
            // Page size input
            'page-size-input',
            // Volume filter elements
            'volume-filter-btn', 'volume-filter-dropdown', 'volume-filter-label',
            // Search input
            'saved-keyword-search'
        ];

        ids.forEach(id => {
            elements[id] = document.getElementById(id);
        });
    }

    // Set up all event listeners
    function setupEventListeners() {
        // View switching
        if (elements['saved-keywords-view']) {
            elements['saved-keywords-view'].addEventListener('click', e => {
                e.preventDefault();
                setActiveView('saved');
            });
        }

        // Sync lists button
        const syncListsBtn = document.getElementById('sync-lists-btn');
        if (syncListsBtn) {
            syncListsBtn.addEventListener('click', e => {
                e.preventDefault();
                // Show loading indicator
                showNotification('Syncing lists...');
                // Force sync with backend
                forceSyncSavedLists();
            });
        }

        // Refresh lists button
        const refreshListsBtn = document.getElementById('refresh-lists-btn');
        if (refreshListsBtn) {
            refreshListsBtn.addEventListener('click', e => {
                e.preventDefault();
                // Clear all localStorage related to saved lists
                localStorage.removeItem('activeListId');
                localStorage.removeItem('savedKeywordLists');
                localStorage.removeItem('savedKeywordsPagination');
                
                // Show loading indicator
                showNotification('Refreshing lists data...');
                
                // Force page reload to clear any cached UI state
                window.location.reload();
            });
        }

        // Create list modal
        setupCreateListModal();

        // Save keywords modal
        setupSaveToListModal();

        // Rename list modal
        setupRenameListModal();

        // Delete list modal
        setupDeleteListModal();

        // Setup sorting
        setupSorting();

        // Setup page size input
        setupPageSizeInput();

        // Set up volume filter
        setupVolumeFilter();

        // Set up search input
        setupSearchInput();

        // Set up create new list button in sidebar
        if (elements['create-new-list']) {
            elements['create-new-list'].addEventListener('click', e => {
                e.preventDefault();
                openCreateListModal();
            });
        }
    }

    // Setup create list modal events
    function setupCreateListModal() {
        const modal = elements['create-list-modal'];
        if (!modal) return;

        // Open modal buttons
        [elements['create-new-list'], elements['create-list-btn']].forEach(btn => {
            if (btn) btn.addEventListener('click', openCreateListModal);
        });

        // Close modal buttons
        [elements['close-modal'], elements['cancel-create-list']].forEach(btn => {
            if (btn) btn.addEventListener('click', () => modal.classList.add('hidden'));
        });

        // Confirm button
        if (elements['confirm-create-list']) {
            elements['confirm-create-list'].addEventListener('click', createNewList);
        }

        // Enter key in input
        if (elements['list-name']) {
            elements['list-name'].addEventListener('keypress', e => {
                if (e.key === 'Enter') createNewList();
            });
        }
    }

    // Setup save to list modal events
    function setupSaveToListModal() {
        const modal = elements['save-to-list-modal'];
        if (!modal) return;

        // Save selected button
        if (elements['save-selected-btn']) {
            elements['save-selected-btn'].addEventListener('click', () => {
                const selectedKeywords = getSelectedKeywords();
                if (selectedKeywords.length === 0) {
                    alert('Please select at least one keyword to save');
                    return;
                }
                openSaveToListModal(selectedKeywords);
            });
        }

        // Close modal buttons
        [elements['close-save-modal'], elements['cancel-save-to-list']].forEach(btn => {
            if (btn) btn.addEventListener('click', () => modal.classList.add('hidden'));
        });

        // Confirm button
        if (elements['confirm-save-to-list']) {
            elements['confirm-save-to-list'].addEventListener('click', saveKeywordsToList);
        }
    }

    // Setup rename list modal events
    function setupRenameListModal() {
        const modal = elements['rename-list-modal'];
        if (!modal) return;

        // Close modal buttons
        const closeBtn = elements['close-rename-modal'];
        const cancelBtn = elements['cancel-rename-list'];
        
        // Remove any existing listeners by cloning and replacing
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            elements['close-rename-modal'] = newCloseBtn;
            
            // Add click event
            newCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            elements['cancel-rename-list'] = newCancelBtn;
            
            // Add click event
            newCancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        // Confirm button
        const confirmBtn = elements['confirm-rename-list'];
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            elements['confirm-rename-list'] = newConfirmBtn;
            
            // Add click event
            newConfirmBtn.addEventListener('click', renameList);
        }

        // Handle enter key in input
        const input = elements['rename-list-input'];
        if (input) {
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            elements['rename-list-input'] = newInput;
            
            // Add keypress event
            newInput.addEventListener('keypress', e => {
                if (e.key === 'Enter') renameList();
            });
        }
    }

    // Setup delete list modal events
    function setupDeleteListModal() {
        const modal = elements['delete-list-modal'];
        if (!modal) return;

        // Close modal buttons
        const closeBtn = elements['close-delete-modal'];
        const cancelBtn = elements['cancel-delete-list'];
        
        // Remove any existing listeners by cloning and replacing
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
            elements['close-delete-modal'] = newCloseBtn;
            
            // Add click event
            newCloseBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }
        
        if (cancelBtn) {
            const newCancelBtn = cancelBtn.cloneNode(true);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            elements['cancel-delete-list'] = newCancelBtn;
            
            // Add click event
            newCancelBtn.addEventListener('click', () => modal.classList.add('hidden'));
        }

        // Confirm button
        const confirmBtn = elements['confirm-delete-list'];
        if (confirmBtn) {
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            elements['confirm-delete-list'] = newConfirmBtn;
            
            // Add click event
            newConfirmBtn.addEventListener('click', deleteList);
        }
    }

    // Set active view (main or saved)
    function setActiveView(view) {
        console.log(`Setting active view to: ${view}`);

        // Check for missing elements before proceeding
        if (!elements['saved-keywords-view']) {
            console.error("Missing element: saved-keywords-view");
        }
        if (!elements['main-table-content']) {
            console.error("Missing element: main-table-content");
        }
        if (!elements['saved-keywords-content']) {
            console.error("Missing element: saved-keywords-content");
        }

        // Update sidebar menu
        document.querySelectorAll('.sidebar-menu-item').forEach(item => item.classList.remove('active'));

        if (view === 'saved') {
            if (elements['saved-keywords-view']) {
                elements['saved-keywords-view'].classList.add('active');
            }
            if (elements['main-table-content']) {
                elements['main-table-content'].classList.add('hidden');
            }
            if (elements['saved-keywords-content']) {
                elements['saved-keywords-content'].classList.remove('hidden');
            }
            updateSavedKeywordsView();
        }
    }

    // Create list functions
    function openCreateListModal() {
        const input = elements['list-name'];
        if (input) {
            input.value = '';
            elements['create-list-modal'].classList.remove('hidden');
            input.focus();
        }
    }

    function createNewList() {
        const listName = elements['list-name'].value.trim();
        if (!listName) {
            alert('Please enter a list name');
            return;
        }

        // Check if list name already exists
        if (state.lists[listName]) {
            alert('A list with this name already exists');
            return;
        }

        // Show loading indicator
        showNotification('Creating new list...');

        // Create the list in the backend
        fetch('/api/save-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: listName,
                keywords: [] // Empty list initially
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error creating list: ' + data.error);
                return;
            }
            
            // Update local state
            state.lists[listName] = {
                name: listName,
                keywords: []
            };
            
            // Set as active list
            state.activeListId = listName;
            localStorage.setItem('activeListId', listName);
            
            // Close modal
            elements['create-list-modal'].classList.add('hidden');
            elements['list-name'].value = '';
            
            // Update all UI components
            updateSavedKeywordListsContainer(); // Update sidebar list container first
            updateSavedKeywordListsSidebar();   // Update sidebar lists
            setActiveView('saved');             // Switch to saved view
            updateSavedKeywordsView();          // Update content
            
            // Show success notification
            showNotification(`Created new list "${listName}"`);
        })
        .catch(error => {
            console.error('Error creating list:', error);
            alert('Failed to create list. Please try again.');
        });
    }

    // Save keywords functions
    function openSaveToListModal(selectedKeywords) {
        const countEl = elements['selected-keywords-count'];
        const select = elements['existing-lists'];
        const newNameInput = elements['new-list-name'];

        if (!countEl || !select || !newNameInput) return;

        // Update count display
        countEl.textContent = selectedKeywords.length;
        
        // Store selected keywords in dataset for later retrieval
        elements['save-to-list-modal'].dataset.keywords = JSON.stringify(selectedKeywords);

        // Populate dropdown
        select.innerHTML = '';
        select.innerHTML = '<option value="new">Create new list</option>';
        const listsSection = document.getElementById('save-to-existing-list');
        const listsCount = Object.keys(state.lists).length;

        if (listsCount === 0) {
            listsSection.classList.add('hidden');
        } else {
            listsSection.classList.remove('hidden');

            // Add options for each list
            Object.entries(state.lists).forEach(([id, list]) => {
                const option = document.createElement('option');
                option.value = id;
                option.textContent = list.name;
                select.appendChild(option);
            });

            // Select active list if exists
            if (state.activeListId && state.lists[state.activeListId]) {
                select.value = state.activeListId;
            }
        }

        // Reset new list input
        newNameInput.value = '';

        // Show modal
        elements['save-to-list-modal'].classList.remove('hidden');

        // Focus appropriate field
        listsCount === 0 ? newNameInput.focus() : select.focus();
    }

    function saveKeywordsToList() {
        const selectedOption = elements['existing-lists'].value;
        const newListName = elements['new-list-name'].value.trim();
        const selectedKeywords = JSON.parse(elements['save-to-list-modal'].dataset.keywords || '[]');
        
        if (selectedKeywords.length === 0) {
            alert('No keywords selected');
            return;
        }
        
        let targetListName = '';
        
        if (selectedOption === 'new' && newListName) {
            // Create new list
            targetListName = newListName;
            
            // Check if list name already exists
            if (state.lists[targetListName]) {
                alert('A list with this name already exists');
                return;
            }
        } else if (selectedOption !== 'new') {
            // Use existing list
            targetListName = selectedOption;
        } else {
            alert('Please select an existing list or enter a new list name');
            return;
        }
        
        // Either create a new list or add to existing one
        let endpoint = '/api/save-list';
        let method = 'POST';
        
        // If adding to existing list, need to get current keywords first
        const currentKeywords = state.lists[targetListName]?.keywords || [];
        const combinedKeywords = [...new Set([...currentKeywords.map(k => k.keyword), ...selectedKeywords])];
        
        fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: targetListName,
                keywords: combinedKeywords
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error saving keywords: ' + data.error);
                return;
            }
            
            // Update local state
            state.lists[targetListName] = {
                name: targetListName,
                keywords: combinedKeywords.map(k => typeof k === 'string' ? {keyword: k} : k)
            };
            
            // Set as active list
            state.activeListId = targetListName;
            localStorage.setItem('activeListId', targetListName);
            
            // Close modal
            elements['save-to-list-modal'].classList.add('hidden');
            
            // Update UI
            setActiveView('saved');
            updateSavedKeywordListsSidebar();
            updateSavedKeywordsView();
            
            // Show success message
            showNotification(`${selectedKeywords.length} keywords saved to "${targetListName}"`);
        })
        .catch(error => {
            console.error('Error saving keywords:', error);
            alert('Failed to save keywords. Please try again.');
        });
    }

    // Sidebar and view updating
    function updateSavedKeywordListsSidebar() {
        const container = document.getElementById('saved-keyword-lists');
        if (!container) return;

        // Clear current content
        container.innerHTML = '';

        // Check if there are any lists
        const listIds = Object.keys(state.lists);
        if (listIds.length === 0) {
            container.innerHTML = `
                <li class="px-4 py-2 text-xs text-indigo-300">
                    No saved lists yet
                </li>
            `;
            return;
        }

        // Add each list to the sidebar
        listIds.forEach(listId => {
            const list = state.lists[listId];
            const keywordCount = list.count || (list.keywords ? list.keywords.length : 0);
            
            // Create list item
            const listItem = document.createElement('li');
            listItem.className = 'relative mb-1';
            
            // Determine active class
            const isActive = state.activeListId === listId;
            const activeClass = isActive ? 'bg-indigo-700 text-white' : 'text-white hover:bg-indigo-800';
            
            listItem.innerHTML = `
                <a href="#" class="saved-list-item flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${activeClass} group relative" data-list-id="${listId}">
                    <div class="flex items-center max-w-[80%] overflow-hidden">
                        <i class="fas fa-list-ul mr-2 text-xs ${isActive ? 'text-indigo-300' : 'text-indigo-400'}"></i>
                        <span class="truncate font-medium">${list.name}</span>
                    </div>
                    <div class="flex items-center">
                        <span class="badge text-xs ${isActive ? 'bg-indigo-600 text-indigo-200' : 'bg-indigo-800 text-indigo-300'} rounded-full px-2 py-0.5 ml-2">${keywordCount}</span>
                    </div>
                </a>
            `;
            
            container.appendChild(listItem);
            
            // Add click event
            const listLink = listItem.querySelector('.saved-list-item');
            listLink.addEventListener('click', e => {
                e.preventDefault();
                state.activeListId = listId;
                localStorage.setItem('activeListId', listId);
                
                // Reset pagination to page 1
                state.pagination.currentPage = 1;
                localStorage.setItem('savedKeywordsPagination', JSON.stringify(state.pagination));
                
                // Fetch keywords for this list from the backend
                fetchSavedList(listId);
                
                // Update UI
                setActiveView('saved');
                updateSavedKeywordListsSidebar();
                updateSavedKeywordsView();
            });
        });
    }

    function updateSavedKeywordsView() {
        console.log("Updating saved keywords view");

        // Reset volume filter when switching view
        state.volumeFilter = '';
        if (elements['volume-filter-label']) {
            elements['volume-filter-label'].textContent = 'Volume Filter';
        }

        // Update sidebar lists
        updateSavedKeywordListsSidebar();

        const listsCount = Object.keys(state.lists).length;

        // Handle empty state
        if (listsCount === 0) {
            if (elements['no-saved-lists']) {
                elements['no-saved-lists'].classList.remove('hidden');
            }
            if (elements['saved-lists-content']) {
                elements['saved-lists-content'].classList.add('hidden');
            }
            console.log("No saved lists found");
            return;
        }

        // Show lists content
        if (elements['no-saved-lists']) {
            elements['no-saved-lists'].classList.add('hidden');
        }
        if (elements['saved-lists-content']) {
            elements['saved-lists-content'].classList.remove('hidden');
        }

        // Update list tabs
        updateListTabs();

        // Select first list if none active
        if (!state.activeListId || !state.lists[state.activeListId]) {
            state.activeListId = Object.keys(state.lists)[0];
            localStorage.setItem('activeListId', state.activeListId);
            // Fetch keywords for this list
            fetchSavedList(state.activeListId);
        }

        // Update active list content
        updateActiveListContent();
    }

    function updateListTabs() {
        const tabs = elements['keyword-list-tabs'];
        if (!tabs) return;

        // Reset volume filter when switching tabs
        state.volumeFilter = '';
        if (elements['volume-filter-label']) {
            elements['volume-filter-label'].textContent = 'Volume Filter';
        }

        tabs.innerHTML = '';

        // Sort lists by creation date (newest first)
        const sortedLists = Object.entries(state.lists)
            .sort(([, a], [, b]) => b.createdAt - a.createdAt);

        // Create tabs
        sortedLists.forEach(([listId, list]) => {
            const isActive = listId === state.activeListId;
            const tab = document.createElement('li');
            tab.className = 'mr-2';

            tab.innerHTML = `
                <a href="#"
                   class="inline-flex items-center px-4 py-2 border-b-2 rounded-t-lg text-sm font-medium ${
                       isActive
                           ? 'text-blue-600 border-blue-600 active'
                           : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                   }"
                   data-list-id="${listId}">
                    <span>${list.name}</span>
                    <span class="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded-full">
                        ${list.keywords.length}
                    </span>
                </a>
            `;

            tabs.appendChild(tab);

            // Add click handler
            tab.querySelector('a').addEventListener('click', e => {
                e.preventDefault();
                state.activeListId = listId;
                localStorage.setItem('activeListId', state.activeListId);
                updateSavedKeywordsView();
            });
        });
    }

    function updateActiveListContent() {
        // If no list is active, don't update
        if (!state.activeListId || !state.lists[state.activeListId]) {
            return;
        }

        const activeList = state.lists[state.activeListId];
        const tableBody = elements['savedKeywordsTableBody'];
        if (!tableBody) return;

        // Update list name and count
        if (elements['active-list-name']) elements['active-list-name'].textContent = activeList.name;
        if (elements['active-list-count']) elements['active-list-count'].textContent = activeList.keywords.length;

        // Apply any active filters and sorting
        let filteredKeywords = [...activeList.keywords];

        // Apply volume filter
        if (state.volumeFilter) {
            filteredKeywords = applyVolumeFilter(filteredKeywords, state.volumeFilter);
        }

        // Apply search filter
        if (state.searchQuery) {
            const query = state.searchQuery.toLowerCase();
            filteredKeywords = filteredKeywords.filter(keyword => 
                keyword.keyword.toLowerCase().includes(query));
        }

        // Sort the keywords
        filteredKeywords.sort((a, b) => {
            let aValue = a[currentSort.column];
            let bValue = b[currentSort.column];

            // For keyword column, do case-insensitive string comparison
            if (currentSort.column === 'keyword') {
                aValue = String(aValue).toLowerCase();
                bValue = String(bValue).toLowerCase();
                return currentSort.order === 'asc' 
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }
            
            // For volume and value columns, try to parse numbers for sorting
            if (currentSort.column === 'volume' || currentSort.column === 'value') {
                // Extract numeric values from strings like "1M - 10M"
                const aNum = extractNumberFromVolumeString(aValue);
                const bNum = extractNumberFromVolumeString(bValue);
                
                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return currentSort.order === 'asc' ? aNum - bNum : bNum - aNum;
                }
                
                // If extraction fails, fall back to string comparison
                if (aValue === '') aValue = currentSort.order === 'asc' ? 'zzz' : '';
                if (bValue === '') bValue = currentSort.order === 'asc' ? 'zzz' : '';
                
                return currentSort.order === 'asc'
                    ? String(aValue).localeCompare(String(bValue))
                    : String(bValue).localeCompare(String(aValue));
            }
            
            // Default string comparison for other columns
            return currentSort.order === 'asc'
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });

        // Update pagination based on filtered keywords
        const startIndex = (state.pagination.currentPage - 1) * state.pagination.itemsPerPage;
        const endIndex = startIndex + state.pagination.itemsPerPage;
        const paginatedKeywords = filteredKeywords.slice(startIndex, endIndex);
        const totalPages = Math.ceil(filteredKeywords.length / state.pagination.itemsPerPage);

        // Clear table body
        tableBody.innerHTML = '';

        if (paginatedKeywords.length === 0) {
            // Show no keywords message
            const row = document.createElement('tr');
            row.innerHTML = `
                <td colspan="5" class="p-6 text-center text-slate-500">
                    <div class="flex flex-col items-center py-6">
                        <i class="fas fa-search text-3xl text-slate-300 mb-3"></i>
                        <p class="text-lg font-medium">No keywords found</p>
                        <p class="text-sm mt-1">Try changing your search or filter settings.</p>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        } else {
            // Create rows for each keyword
            paginatedKeywords.forEach((keyword, index) => {
                const row = document.createElement('tr');
                row.className = `table-row ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} border-b border-slate-100`;
                
                // Format the volume badge - match main table style with consistent rounded background
                let volumeDisplay = '';
                if (keyword.volume) {
                    if (keyword.volume.toLowerCase() === 'na' || keyword.volume === '') {
                        volumeDisplay = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600" style="display: inline-block; width: auto; min-width: 80px; text-align: center;">
                            NA
                        </span>`;
                    } else {
                        // Use a consistent rounded style with light green background for all volume values
                        volumeDisplay = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800" style="display: inline-block; width: auto; min-width: 80px; text-align: center;">
                            ${keyword.volume}
                        </span>`;
                    }
                } else {
                    volumeDisplay = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600" style="display: inline-block; width: auto; min-width: 80px; text-align: center;">
                        NA
                    </span>`;
                }
                
                // Format value/KD - match main table style
                let valueDisplay = '';
                if (keyword.value && keyword.value !== '') {
                    // Try to parse as number
                    const valueNum = parseFloat(keyword.value);
                    if (!isNaN(valueNum)) {
                        if (valueNum <= 15) {
                            valueDisplay = '<span class="text-green-600 font-medium">Low</span>';
                        } else if (valueNum <= 30) {
                            valueDisplay = '<span class="text-amber-600 font-medium">Medium</span>';
                        } else {
                            valueDisplay = '<span class="text-red-600 font-medium">High</span>';
                        }
                    } else {
                        valueDisplay = keyword.value;
                    }
                } else {
                    valueDisplay = '-';
                }

                row.innerHTML = `
                    <td class="py-2 px-1">
                        <input type="checkbox" class="saved-keyword-checkbox w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                            data-keyword="${escapeHtml(keyword.keyword)}">
                    </td>
                    <td class="py-2 px-2 text-sm font-medium text-slate-900">
                        ${escapeHtml(keyword.keyword)}
                    </td>
                    <td class="py-2 px-2 text-sm text-slate-700">
                        ${volumeDisplay}
                    </td>
                    <td class="py-2 px-2 text-sm text-slate-700">
                        ${valueDisplay}
                    </td>
                    <td class="py-2 px-1 text-center">
                        <button class="delete-keyword text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                            data-keyword="${escapeHtml(keyword.keyword)}" title="Remove from list">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                
                tableBody.appendChild(row);
                
                // Attach delete event handler to the button
                const deleteBtn = row.querySelector('.delete-keyword');
                if (deleteBtn) {
                    deleteBtn.addEventListener('click', () => {
                        removeKeywordFromList(deleteBtn.dataset.keyword);
                    });
                }
            });
        }

        // Update pagination controls
        updatePagination(filteredKeywords.length, totalPages);

        // Setup "Select All" checkbox
        setupSelectAllCheckbox();
        
        // Setup the action buttons
        setupActiveListButtons();
    }

    // Helper function to escape HTML
    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    // Set up buttons for active list
    function setupActiveListButtons() {
        // Export button
        if (elements['export-list']) {
            // Remove previous event listener by cloning and replacing
            const oldExportBtn = elements['export-list'];
            const newExportBtn = oldExportBtn.cloneNode(true);
            oldExportBtn.parentNode.replaceChild(newExportBtn, oldExportBtn);
            
            // Update reference in elements
            elements['export-list'] = newExportBtn;
            
            // Add new event listener
            newExportBtn.addEventListener('click', () => {
                if (!state.activeListId) return;
                exportKeywordList(state.activeListId);
            });
        }
        
        // Rename button
        if (elements['edit-list-name']) {
            // Remove previous event listener by cloning and replacing
            const oldRenameBtn = elements['edit-list-name'];
            const newRenameBtn = oldRenameBtn.cloneNode(true);
            oldRenameBtn.parentNode.replaceChild(newRenameBtn, oldRenameBtn);
            
            // Update reference in elements
            elements['edit-list-name'] = newRenameBtn;
            
            // Add new event listener
            newRenameBtn.addEventListener('click', () => {
                if (!state.activeListId) return;
                openRenameListModal(state.activeListId);
            });
        }
        
        // Delete button
        if (elements['delete-list']) {
            // Remove previous event listener by cloning and replacing
            const oldDeleteBtn = elements['delete-list'];
            const newDeleteBtn = oldDeleteBtn.cloneNode(true);
            oldDeleteBtn.parentNode.replaceChild(newDeleteBtn, oldDeleteBtn);
            
            // Update reference in elements
            elements['delete-list'] = newDeleteBtn;
            
            // Add new event listener
            newDeleteBtn.addEventListener('click', () => {
                if (!state.activeListId) return;
                openDeleteListModal(state.activeListId);
            });
        }
    }

    // Function to copy selected keywords
    function copySelectedKeywords() {
        const selectedBoxes = document.querySelectorAll('input[type="checkbox"][data-saved-keyword]:checked');
        if (selectedBoxes.length === 0) {
            alert('Please select at least one keyword to copy');
            return;
        }

        const selectedKeywords = Array.from(selectedBoxes).map(cb => cb.dataset.savedKeyword);
        const keywordsText = selectedKeywords.join('\n');

        // Copy to clipboard
        navigator.clipboard.writeText(keywordsText)
            .then(() => {
                // Show success notification
                showNotification(`${selectedKeywords.length} keyword${selectedKeywords.length !== 1 ? 's' : ''} copied to clipboard`);
            })
            .catch(err => {
                console.error('Could not copy text: ', err);
                alert('Failed to copy keywords to clipboard');
            });
    }

    // Show temporary notification
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
        notification.className = 'bg-slate-800 text-white py-2 px-4 rounded-md shadow-lg mb-2 flex items-center';
        notification.innerHTML = `
            <i class="fas fa-check-circle text-green-400 mr-2"></i>
            <span>${message}</span>
        `;

        // Add to container
        notificationContainer.appendChild(notification);

        // Fade out and remove
        setTimeout(() => {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => {
                notification.remove();
            }, 500);
        }, duration);
    }

    // List management functions
    function removeKeywordFromList(keyword) {
        if (!state.activeListId || !state.lists[state.activeListId]) return;

        // Find the keyword in the list
        const list = state.lists[state.activeListId];
        const keywordIndex = list.keywords.findIndex(k => k.keyword === keyword);
        
        if (keywordIndex !== -1) {
            // Remove the keyword
            list.keywords.splice(keywordIndex, 1);
            
            // Save the changes and update UI
        saveLists();
            updateActiveListContent();
            
            // Update sidebar to reflect new count
        updateSavedKeywordListsSidebar();
            
            // Show notification
            showNotification(`Removed "${keyword}" from list`);
        }
    }

    function exportKeywordList(listId) {
        const list = state.lists[listId];
        if (!list || list.keywords.length === 0) {
            alert('This list is empty. Please add keywords first.');
            return;
        }

        // Create CSV content
        let csvContent = 'Keyword,Volume,Value\n';
        
        // Add each keyword as a row
        list.keywords.forEach(keyword => {
            // Properly format each field for CSV
            const formattedKeyword = `"${keyword.keyword.replace(/"/g, '""')}"`;
            const formattedVolume = `"${keyword.volume || ''}"`;
            const formattedValue = `"${keyword.value || ''}"`;
            
            csvContent += `${formattedKeyword},${formattedVolume},${formattedValue}\n`;
        });
        
        // Create a blob and download link
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${list.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_keywords.csv`);
        link.style.visibility = 'hidden';
        
        // Append to body, click to download, then remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show confirmation
        showNotification(`Exported ${list.keywords.length} keywords from "${list.name}"`);
    }

    // Rename list functions
    function openRenameListModal(listId) {
        const list = state.lists[listId];
        if (!list) return;
        
        // Set current name in the input
        if (elements['rename-list-input']) {
            elements['rename-list-input'].value = list.name;
        }
        
        // Store the list ID being renamed
        state.renameListId = listId;
        
        // Show the modal
        if (elements['rename-list-modal']) {
            elements['rename-list-modal'].classList.remove('hidden');
            // Focus the input
            if (elements['rename-list-input']) {
                elements['rename-list-input'].focus();
                elements['rename-list-input'].select();
            }
        }
    }

    function renameList() {
        if (!state.renameListId || !state.lists[state.renameListId]) return;
        
        const newName = elements['rename-list-input'].value.trim();
        
        if (!newName) {
            alert('Please enter a valid list name');
            return;
        }

        // Update the list name
        state.lists[state.renameListId].name = newName;
        
        // Save changes
        saveLists();

        // Update UI
        updateSavedKeywordListsSidebar();
        updateSavedKeywordsView();
        
        // Close the modal
        if (elements['rename-list-modal']) {
            elements['rename-list-modal'].classList.add('hidden');
        }
        
        // Show confirmation
        showNotification(`Renamed list to "${newName}"`);
    }

    // Delete list functions
    function openDeleteListModal(listId) {
        const list = state.lists[listId];
        if (!list) return;
        
        // Set list name and count in the modal
        if (elements['delete-list-name']) {
            elements['delete-list-name'].textContent = list.name;
        }
        
        if (elements['delete-list-count']) {
            const keywordCount = list.keywords ? list.keywords.length : (list.count || 0);
            elements['delete-list-count'].textContent = keywordCount;
        }
        
        // Store the list ID in the dataset for the delete function
        if (elements['delete-list-modal']) {
            elements['delete-list-modal'].dataset.listId = listId;
            elements['delete-list-modal'].classList.remove('hidden');
        }
    }

    function deleteList() {
        const listId = elements['delete-list-modal'].dataset.listId;
        if (!listId || !state.lists[listId]) {
            console.error('Invalid list id for deletion:', listId);
            return;
        }
        
        // Show loading indicator
        showNotification(`Deleting list "${listId}"...`);
        
        // Call the backend API to delete the list
        fetch('/api/delete-list', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: listId
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error deleting list: ' + data.error);
                return;
            }
            
            // Remove from local state
            delete state.lists[listId];
            
            // Clear list from the sidebar immediately
            const sidebarItem = document.querySelector(`.saved-keyword-list-item[data-list-id="${listId}"]`);
            if (sidebarItem) {
                sidebarItem.remove();
            }
            
            // If this was the active list, reset active
            if (state.activeListId === listId) {
                const remainingLists = Object.keys(state.lists);
                state.activeListId = remainingLists.length > 0 ? remainingLists[0] : null;
                localStorage.removeItem('activeListId'); // Remove instead of setting to empty
            }
            
            // Clear any local storage caches that might cause stale UI
            localStorage.removeItem('savedKeywordLists');
            
            // Close modal
            elements['delete-list-modal'].classList.add('hidden');
            
            // Completely refresh the lists from backend
            forceSyncSavedLists();
            
            // Show notification
            showNotification(`List "${listId}" has been deleted`);
        })
        .catch(error => {
            console.error('Error deleting list:', error);
            alert('Failed to delete list. Please try again.');
        });
    }

    // Helper functions
    function getSelectedKeywords() {
        // Grab every keyword in the global Set (automatically de-duplicated)
        return Array.from(window.selectedKeywordsSet || []);
    }

    function saveLists() {
        localStorage.setItem('savedKeywordLists', JSON.stringify(state.lists));
        localStorage.setItem('savedKeywordsPagination', JSON.stringify(state.pagination));
    }

    function formatNumber(num) {
        if (!num || num.toString().trim() === '') return "NA";
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    // Set up sorting functionality
    function setupSorting() {
        const headers = document.querySelectorAll('th[data-sort]');
        if (headers.length === 0) return;

        headers.forEach(header => {
            header.addEventListener('click', function() {
                const column = this.dataset.sort;
                if (!column) return;

                // Toggle sort order if we're clicking the same column
                if (currentSort.column === column) {
                    currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
                } else {
                    currentSort.column = column;
                    currentSort.order = 'asc';
                }

                // Update sorting indicators
                updateSortIndicators();

                // Refresh the list with new sorting
                updateActiveListContent();
            });
        });
    }

    // Update sort indicators in the UI
    function updateSortIndicators() {
        // Reset all indicators
        document.querySelectorAll('#saved-keywords-content th[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort ml-2 text-slate-400';
        });

        // Update current sort indicator
        const currentHeader = document.querySelector(`#saved-keywords-content th[data-sort="${currentSort.column}"] i`);
        if (currentHeader) {
            currentHeader.className = `fas fa-sort-${currentSort.order === 'asc' ? 'up' : 'down'} ml-2 text-blue-500`;
        }
    }

    // Update pagination UI and setup handlers
    function updatePagination(totalItems, totalPages) {
        const paginationContainer = elements['keywords-pagination'];
        const pageSizeControl = document.getElementById('page-size-control');
        if (!paginationContainer) return;

        if (totalPages <= 1 && totalItems <= state.pagination.itemsPerPage) {
            paginationContainer.classList.add('hidden');
            // Show page size control even when pagination is hidden
            if (pageSizeControl) {
                pageSizeControl.classList.remove('hidden');
            }
            return;
        }

        paginationContainer.classList.remove('hidden');
        if (pageSizeControl) {
            pageSizeControl.classList.remove('hidden');
        }

        // Build pagination UI
        const currentPage = state.pagination.currentPage;
        let paginationHTML = `
            <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
                <div class="flex flex-1 justify-between sm:hidden">
                    <button data-page="${Math.max(1, currentPage - 1)}" class="page-btn relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                        Previous
                    </button>
                    <button data-page="${Math.min(totalPages, currentPage + 1)}" class="page-btn relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                        Next
                    </button>
                </div>
                <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                        <p class="text-sm text-gray-700">
                            Showing <span class="font-medium">${Math.min(totalItems, (currentPage - 1) * state.pagination.itemsPerPage + 1)}</span> to
                            <span class="font-medium">${Math.min(totalItems, currentPage * state.pagination.itemsPerPage)}</span> of
                            <span class="font-medium">${totalItems}</span> results
                        </p>
                    </div>
                    <div>
                        <nav class="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                            <button data-page="${Math.max(1, currentPage - 1)}" class="page-btn relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}">
                                <span class="sr-only">Previous</span>
                                <i class="fas fa-chevron-left h-5 w-5"></i>
                            </button>
                `;

        // Generate page numbers
        const pagesToShow = 5; // Maximum number of page buttons to show
        let startPage = Math.max(1, currentPage - Math.floor(pagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + pagesToShow - 1);

        // Adjust if we're near the end
        if (endPage - startPage + 1 < pagesToShow) {
            startPage = Math.max(1, endPage - pagesToShow + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button data-page="${i}" class="page-btn relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i ? 'bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}">
                    ${i}
                </button>
            `;
        }

        paginationHTML += `
                            <button data-page="${Math.min(totalPages, currentPage + 1)}" class="page-btn relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}">
                                <span class="sr-only">Next</span>
                                <i class="fas fa-chevron-right h-5 w-5"></i>
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        `;

        paginationContainer.innerHTML = paginationHTML;

        // Add event listeners for pagination buttons
        document.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                if (page !== state.pagination.currentPage) {
                    state.pagination.currentPage = page;
                    saveLists(); // Save pagination state
                    updateActiveListContent();
                }
            });
        });
    }

    // Setup page size input event listener
    function setupPageSizeInput() {
        if (elements['page-size-input']) {
            elements['page-size-input'].addEventListener('change', function() {
                updatePageSize(this);
            });
            // Trigger initial update if value exists
            if (elements['page-size-input'].value !== state.pagination.itemsPerPage.toString()) {
                 elements['page-size-input'].value = state.pagination.itemsPerPage;
            }
        }
    }

    // Helper function to update page size
    function updatePageSize(inputElement) {
        let newPageSize = parseInt(inputElement.value);

        // Validate input
        if (isNaN(newPageSize) || newPageSize < 10) {
            newPageSize = 10;
            inputElement.value = 10;
        } else if (newPageSize > 500) {
            newPageSize = 500;
            inputElement.value = 500;
        }

        // Only update if value has changed
        if (newPageSize !== state.pagination.itemsPerPage) {
            // Update state and reset to page 1
            state.pagination.itemsPerPage = newPageSize;
            state.pagination.currentPage = 1;

            // Save pagination settings
            saveLists();

            // Update table with new page size
            updateActiveListContent();
        }
    }

    // Set up volume filter dropdown
    function setupVolumeFilter() {
        if (!elements['volume-filter-btn'] || !elements['volume-filter-dropdown']) return;

        // Toggle dropdown
        elements['volume-filter-btn'].addEventListener('click', function(e) {
            e.preventDefault();
            elements['volume-filter-dropdown'].classList.toggle('hidden');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!elements['volume-filter-btn']?.contains(e.target) &&
                !elements['volume-filter-dropdown']?.contains(e.target)) {
                elements['volume-filter-dropdown']?.classList.add('hidden');
            }
        });

        // Handle filter option selection
        const filterOptions = document.querySelectorAll('.volume-filter-option');
        filterOptions.forEach(option => {
            option.addEventListener('click', function(e) {
                e.preventDefault();
                const filter = this.dataset.filter;
                state.volumeFilter = filter;

                // Update label
                elements['volume-filter-label'].textContent = filter || 'Volume Filter';

                // Close dropdown
                elements['volume-filter-dropdown'].classList.add('hidden');

                // Apply filter and refresh view
                updateActiveListContent();
            });
        });
    }

    // Setup search input listener
    function setupSearchInput() {
        if (elements['saved-keyword-search']) {
            elements['saved-keyword-search'].addEventListener('input', function() {
                state.searchQuery = this.value;
                // Reset pagination to page 1 when searching
                state.pagination.currentPage = 1;
                updateActiveListContent();
            });
        }
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

    // Filter keywords based on volume filter
    function applyVolumeFilter(keywords, filter) {
        // If no filter is applied, return all keywords
        if (!filter) return keywords;
        
        return keywords.filter(keyword => {
            const volume = keyword.volume ? String(keyword.volume).toLowerCase() : '';
            
            // Handle blank filter
            if (filter === 'blank') {
                return volume === '' || volume === 'na' || volume === 'n/a';
            }
            
            // Exit early if volume is empty and we're not filtering for blanks
            if (!volume) return false;
            
            // Handle other filters
            if (filter === '10K-100K') {
                return volume.includes('10k') && !volume.includes('100k');
            } else if (filter === '100K-1M') {
                return volume.includes('100k') || (volume.includes('k') && !volume.includes('m'));
            } else if (filter === '1M-10M') {
                return volume.includes('1m') || volume.includes('1m – 10m');
            }
            
            return true;
        });
    }

    // Setup the "Select All" checkbox functionality
    function setupSelectAllCheckbox() {
        const selectAllCheckbox = document.getElementById('selectAllSaved');
        if (!selectAllCheckbox) return;
        
        // Add event listener
        selectAllCheckbox.addEventListener('change', function() {
            // Get all keyword checkboxes
            const checkboxes = document.querySelectorAll('.saved-keyword-checkbox');
            
            // Update all checkboxes to match the "Select All" state
            checkboxes.forEach(checkbox => {
                checkbox.checked = selectAllCheckbox.checked;
            });
        });
        
        // Update state based on individual checkboxes
        const checkboxes = document.querySelectorAll('.saved-keyword-checkbox');
        if (checkboxes.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
            return;
        }
        
        // Count selected checkboxes
        const selectedCount = [...checkboxes].filter(cb => cb.checked).length;
        
        // Update select all checkbox state
        if (selectedCount === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (selectedCount === checkboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }
        
        // Add click handlers for individual checkboxes
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                // Recheck all checkboxes after any change
                const allCheckboxes = document.querySelectorAll('.saved-keyword-checkbox');
                const selectedCount = [...allCheckboxes].filter(cb => cb.checked).length;
                
                if (selectedCount === 0) {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = false;
                } else if (selectedCount === allCheckboxes.length) {
                    selectAllCheckbox.checked = true;
                    selectAllCheckbox.indeterminate = false;
                } else {
                    selectAllCheckbox.checked = false;
                    selectAllCheckbox.indeterminate = true;
                }
            });
        });
    }

    // Reduce spacing in table headers
    function adjustTableHeaderSpacing() {
        // Wait for DOM to be fully loaded
        setTimeout(() => {
            const headerCells = document.querySelectorAll('th.py-4.px-6');
            headerCells.forEach(cell => {
                cell.classList.remove('px-6');
                cell.classList.add('px-2');
            });
        }, 500);
    }

    // Force sync with backend and clear all UI caches 
    function forceSyncSavedLists() {
        // Clear all related localStorage items
        localStorage.removeItem('activeListId');
        localStorage.removeItem('savedKeywordLists');
        localStorage.removeItem('savedKeywordsPagination');

        // Clear UI elements that might be stale
        clearSavedKeywordListsContainer();
        
        // Re-fetch from backend
        fetch('/api/saved-lists')
            .then(response => response.json())
            .then(data => {
                // Convert the response to our state format
                const lists = {};
                
                if (data.lists && data.lists.length > 0) {
                    data.lists.forEach(list => {
                        lists[list.name] = {
                            name: list.name,
                            count: list.count,
                            keywords: [] // We'll fetch these when needed
                        };
                    });
                    console.log("Loaded lists from backend:", Object.keys(lists));
                } else {
                    console.log("No saved lists found in backend during force sync");
                }
                
                // Replace state with fresh data
                state.lists = lists;
                
                // Update all UI components
                updateSavedKeywordListsContainer();
                updateSavedKeywordListsSidebar();
                updateSavedKeywordsView();
                
                // Show notification
                showNotification("Synced saved lists with server");
            })
            .catch(error => {
                console.error('Error during force sync:', error);
            });
    }

    // Clear the saved keyword lists container in the sidebar
    function clearSavedKeywordListsContainer() {
        const container = document.getElementById('saved-keyword-lists-container');
        if (container) {
            // Keep only the create list button and remove list items
            const createListBtn = container.querySelector('#create-list-btn');
            container.innerHTML = '';
            if (createListBtn) {
                container.appendChild(createListBtn);
            }
        }
    }

    // Update the saved keyword lists container in the sidebar
    function updateSavedKeywordListsContainer() {
        const container = document.getElementById('saved-keyword-lists-container');
        if (!container) return;
        
        // Clear current items (except create list button)
        clearSavedKeywordListsContainer();
        
        // Get list of saved lists
        const listIds = Object.keys(state.lists);
        if (listIds.length === 0) {
            return; // No lists to display
        }
        
        // Add each list to the container
        listIds.forEach(listId => {
            const list = state.lists[listId];
            const keywordCount = list.count || (list.keywords ? list.keywords.length : 0);
            
            // Create list item
            const listItem = document.createElement('div');
            listItem.className = 'saved-keyword-list-item saved-keyword-list flex items-center justify-between p-2 rounded mb-1';
            listItem.setAttribute('data-list-id', listId);
            
            listItem.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-list-ul mr-2 sidebar-item-icon preserve-icon"></i>
                    <span class="sidebar-item-text">${list.name}</span>
                </div>
                <span class="bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded sidebar-item-text">${keywordCount}</span>
            `;
            
            // Add to container before the create list button
            const createListBtn = container.querySelector('#create-list-btn');
            if (createListBtn) {
                container.insertBefore(listItem, createListBtn);
            } else {
                container.appendChild(listItem);
            }
            
            // Add click event to list item
            listItem.addEventListener('click', e => {
                e.preventDefault();
                state.activeListId = listId;
                localStorage.setItem('activeListId', listId);
                
                // Fetch keywords for this list
                fetchSavedList(listId);
                
                // Update UI
                setActiveView('saved');
            });
        });
    }

    // Public API
    return {
        init: init,
        updateSavedKeywordListsSidebar: updateSavedKeywordListsSidebar,
        updateSavedKeywordsView: updateSavedKeywordsView,
        saveKeywordsToList: saveKeywordsToList
    };
})();

// Initialize the module
document.addEventListener('DOMContentLoaded', SavedKeywords.init);
