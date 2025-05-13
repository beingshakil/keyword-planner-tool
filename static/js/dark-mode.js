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