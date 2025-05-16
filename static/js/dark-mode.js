// Dark Mode functionality
const DarkMode = {
    init: function() {
        console.log("Initializing Dark Mode...");
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        
        if (!darkModeToggle) {
            console.error("Dark mode toggle button not found in the DOM");
            // Try to create it if not found
            this.createToggleButton();
            return;
        }
        
        console.log("Dark mode toggle button found, setting up listeners");
        
        // Check localStorage for user preference
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        console.log("Dark mode preference from localStorage:", isDarkMode);
        
        // Apply initial state
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
            this.updateThemeColor(true);
            console.log("Applied dark mode");
        }
        
        // Add event listener for toggle
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Dark mode toggle clicked");
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            // Update icon
            this.innerHTML = isDark 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
                
            // Update theme color
            DarkMode.updateThemeColor(isDark);
            console.log("Toggled dark mode, new state:", isDark);
        });
        
        // Also check system preference if no saved preference
        if (localStorage.getItem('darkMode') === null) {
            const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            console.log("No saved preference, checking system preference:", prefersDark);
            if (prefersDark) {
                document.body.classList.add('dark-mode');
                darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                this.updateThemeColor(true);
                console.log("Applied dark mode based on system preference");
            }
        }
    },
    
    // Create toggle button if not found
    createToggleButton: function() {
        console.log("Creating dark mode toggle button");
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'dark-mode-toggle';
        toggleBtn.className = 'dark-mode-toggle';
        toggleBtn.setAttribute('title', 'Toggle Dark Mode');
        toggleBtn.innerHTML = document.body.classList.contains('dark-mode') 
            ? '<i class="fas fa-sun"></i>' 
            : '<i class="fas fa-moon"></i>';
            
        document.body.appendChild(toggleBtn);
        
        // Retry initialization
        setTimeout(() => {
            this.init();
        }, 100);
    },
    
    // Update theme-color meta tag for mobile browsers
    updateThemeColor: function(isDark) {
        const themeColorMeta = document.getElementById('theme-color');
        if (themeColorMeta) {
            themeColorMeta.setAttribute('content', isDark ? '#0f172a' : '#4f46e5');
            console.log("Updated theme-color meta tag to:", isDark ? '#0f172a' : '#4f46e5');
        }
    },
    
    // Check if dark mode is active
    isDark: function() {
        return document.body.classList.contains('dark-mode');
    },
    
    // Manually toggle dark mode
    toggle: function() {
        console.log("Manual toggle requested");
        const darkModeToggle = document.getElementById('dark-mode-toggle');
        if (darkModeToggle) {
            darkModeToggle.click();
        } else {
            console.log("Toggle button not found, toggling manually");
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            this.updateThemeColor(isDark);
        }
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, initializing dark mode");
    DarkMode.init();
    
    // Listen for system color scheme changes
    if (window.matchMedia) {
        const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        if (colorSchemeQuery.addEventListener) {
            colorSchemeQuery.addEventListener('change', function(e) {
                // Only auto-switch if user hasn't set a preference
                if (localStorage.getItem('darkMode') === null) {
                    console.log("System color scheme changed, applying new theme");
                    if (e.matches) {
                        document.body.classList.add('dark-mode');
                        const darkModeToggle = document.getElementById('dark-mode-toggle');
                        if (darkModeToggle) {
                            darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
                        }
                        DarkMode.updateThemeColor(true);
                    } else {
                        document.body.classList.remove('dark-mode');
                        const darkModeToggle = document.getElementById('dark-mode-toggle');
                        if (darkModeToggle) {
                            darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
                        }
                        DarkMode.updateThemeColor(false);
                    }
                }
            });
        }
    }
});

// Add an additional trigger for when window is fully loaded
window.addEventListener('load', function() {
    console.log("Window fully loaded, ensuring dark mode is initialized");
    // If the button exists but dark mode isn't working, retry initialization
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle && !darkModeToggle.hasAttribute('data-initialized')) {
        darkModeToggle.setAttribute('data-initialized', 'true');
        darkModeToggle.addEventListener('click', function(e) {
            e.preventDefault();
            console.log("Backup click handler triggered");
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('darkMode', isDark);
            
            // Update icon
            this.innerHTML = isDark 
                ? '<i class="fas fa-sun"></i>' 
                : '<i class="fas fa-moon"></i>';
                
            // Update theme color
            DarkMode.updateThemeColor(isDark);
        });
    }
});

// Make available globally
window.DarkMode = DarkMode;

// Dark mode functionality
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const body = document.body;
    const themeColorMeta = document.getElementById('theme-color');
    
    if (!darkModeToggle) {
        console.error("Dark mode toggle button not found");
        return;
    }
    
    // Check for saved preference in localStorage
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    
    // Initialize based on saved preference or system preference
    if (isDarkMode) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
    
    // Add direct click handler to ensure it works
    darkModeToggle.onclick = function(e) {
        if (e) e.preventDefault();
        
        if (body.classList.contains('dark-mode')) {
            disableDarkMode();
        } else {
            enableDarkMode();
        }
    };
    
    // Functions to enable/disable dark mode
    function enableDarkMode() {
        body.classList.add('dark-mode');
        body.classList.remove('light-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        darkModeToggle.setAttribute('title', 'Switch to Light Mode');
        if (themeColorMeta) themeColorMeta.content = '#1e293b';
        localStorage.setItem('darkMode', 'true');
        
        // Update UI elements for dark mode
        updateUIForDarkMode(true);
    }
    
    function disableDarkMode() {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        darkModeToggle.setAttribute('title', 'Switch to Dark Mode');
        if (themeColorMeta) themeColorMeta.content = '#4f46e5';
        localStorage.setItem('darkMode', 'false');
        
        // Update UI elements for light mode
        updateUIForDarkMode(false);
    }
    
    // Update UI elements based on dark mode state
    function updateUIForDarkMode(isDarkMode) {
        // Set CSS variables for theme colors
        const root = document.documentElement;
        
        if (isDarkMode) {
            // Dark mode colors
            root.style.setProperty('--bg-primary', '#0f172a');
            root.style.setProperty('--bg-secondary', '#1e293b');
            root.style.setProperty('--text-primary', '#f8fafc');
            root.style.setProperty('--text-secondary', '#cbd5e1');
            root.style.setProperty('--border-color', '#334155');
            
            // Update table headers
            document.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#1e293b';
                th.style.color = '#f8fafc';
            });
            
            // Update table cells
            document.querySelectorAll('td').forEach(td => {
                td.style.color = '#f8fafc';
            });
        } else {
            // Light mode colors
            root.style.setProperty('--bg-primary', '#f8fafc');
            root.style.setProperty('--bg-secondary', '#f1f5f9');
            root.style.setProperty('--text-primary', '#1e293b');
            root.style.setProperty('--text-secondary', '#475569');
            root.style.setProperty('--border-color', '#e2e8f0');
            
            // Reset table headers
            document.querySelectorAll('th').forEach(th => {
                th.style.backgroundColor = '#f8fafc';
                th.style.color = '#1e293b';
            });
            
            // Reset table cells
            document.querySelectorAll('td').forEach(td => {
                td.style.color = '#1e293b';
            });
        }
    }
    
    // Also check system preference for dark mode
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Apply system preference if no manual preference has been saved
    if (localStorage.getItem('darkMode') === null && darkModeMediaQuery.matches) {
        enableDarkMode();
    }
    
    // Listen for system preference changes
    darkModeMediaQuery.addEventListener('change', function(e) {
        // Only auto-switch if no manual preference has been set
        if (localStorage.getItem('darkMode') === null) {
            if (e.matches) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        }
    });
}); 