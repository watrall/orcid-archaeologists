// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    researchers: [],
    filteredResearchers: [],
    activeFilter: null,
    cache: {
        data: null,
        timestamp: null,
        ttl: 86400000 // 24 hours in milliseconds
    },
    currentPage: 0,
    pageSize: 20,
    totalResults: 0,
    
    // Initialize the application
    init: function() {
        this.showLoading();
        this.loadFromCache();
        this.fetchResearchers();
        this.setupEventListeners();
        this.updateCacheInfo();
    },
    
    // Show loading indicator
    showLoading: function() {
        var resultsCount = document.getElementById('resultsCount');
        var container = document.getElementById('researchersContainer');
        
        resultsCount.textContent = '';
        
        container.innerHTML = ''
            + '<div class="loading">'
            + '    <div class="spinner"></div>'
            + '    <p style="margin-top: 20px;">Loading archaeologists from ORCID...</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Fetching data from the ORCID Public API</p>'
            + '</div>';
    },
    
    // Load data from cache if available and not expired
    loadFromCache: function() {
        try {
            var cachedData = localStorage.getItem('orcid_archaeologists_index');
            if (cachedData) {
                var cache = JSON.parse(cachedData);
                var now = new Date().getTime();
                
                // Check if cache is still valid
                if (cache.timestamp && (now - cache.timestamp) < this.cache.ttl) {
                    this.researchers = cache.data;
                    this.displayResearchers();
                    console.log('Loaded archaeologists from cache');
                    return true;
                } else {
                    console.log('Cache expired, fetching fresh data');
                }
            }
        } catch (error) {
            console.error('Error loading from cache:', error);
        }
        return false;
    },
    
    // Save data to cache
    saveToCache: function() {
        try {
            var cacheData = {
                data: this.researchers,
                timestamp: new Date().getTime()
            };
            localStorage.setItem('orcid_archaeologists_index', JSON.stringify(cacheData));
            this.updateCacheInfo();
        } catch (error) {
            console.error('Error saving to cache:', error);
        }
    },
    
    // Update cache information display
    updateCacheInfo: function() {
        var cacheInfo = document.getElementById('cacheInfo');
        if (this.cache.timestamp) {
            var now = new Date().getTime();
            var hoursAgo = Math.floor((now - this.cache.timestamp) / (1000 * 60 * 60));
            cacheInfo.textContent = 'Cached ' + hoursAgo + ' hours ago';
        } else {
            cacheInfo.textContent = '';
        }
    },
    
    // Fetch researchers (using mock data for preview)
    fetchResearchers: function() {
        // For this preview, we'll use mock data since direct API calls are blocked by CORS
        // In a real implementation, you would use the ORCID API
        
        // Simulate API delay
        var self = this;
        setTimeout(function() {
            self.researchers = [
                {
                    orcid: "0000-0001-2345-6789",
                    name: "Dr. Eleanor Martinez",
                    location: "Oxford, United Kingdom",
                    employment: "University of Oxford",
                    keywords: ["Bronze Age", "ceramic analysis", "Mediterranean", "fieldwork"],
                    orcidUrl: "https://orcid.org/0000-0001-2345-6789",
                    isDemo: true
                },
                {
                    orcid: "0000-0002-3456-7890",
                    name: "Prof. James Wilson",
                    location: "Cairo, Egypt",
                    employment: "American University in Cairo",
                    keywords: ["Egyptology", "hieroglyphs", "excavation", "conservation"],
                    orcidUrl: "https://orcid.org/0000-0002-3456-7890",
                    isDemo: true
                },
                {
                    orcid: "0000-0003-4567-8901",
                    name: "Dr. Sarah Chen",
                    location: "Beijing, China",
                    employment: "Peking University",
                    keywords: ["Neolithic", "pottery", "East Asia", "remote sensing"],
                    orcidUrl: "https://orcid.org/0000-0003-4567-8901",
                    isDemo: true
                },
                {
                    orcid: "0000-0004-5678-9012",
                    name: "Dr. Michael O'Connor",
                    location: "Sydney, Australia",
                    employment: "University of Sydney",
                    keywords: ["indigenous studies", "rock art", "Australia", "heritage management"],
                    orcidUrl: "https://orcid.org/0000-0004-5678-9012",
                    isDemo: true
                },
                {
                    orcid: "0000-0005-6789-0123",
                    name: "Prof. Anna Petrova",
                    location: "Moscow, Russia",
                    employment: "Lomonosov Moscow State University",
                    keywords: ["Scythian culture", "burial mounds", "metalwork", "steppe regions"],
                    orcidUrl: "https://orcid.org/0000-0005-6789-0123",
                    isDemo: true
                },
                {
                    orcid: "0000-0006-7890-1234",
                    name: "Dr. Carlos Mendez",
                    location: "Mexico City, Mexico",
                    employment: "National Autonomous University of Mexico",
                    keywords: ["Maya civilization", "epigraphy", "Mesoamerica", "architectural analysis"],
                    orcidUrl: "https://orcid.org/0000-0006-7890-1234",
                    isDemo: true
                },
                {
                    orcid: "0000-0007-8901-2345",
                    name: "Dr. Fatima Al-Fihri",
                    location: "Fez, Morocco",
                    employment: "University of al-Qarawiyyin",
                    keywords: ["Islamic archaeology", "North Africa", "manuscript studies", "urban development"],
                    orcidUrl: "https://orcid.org/0000-0007-8901-2345",
                    isDemo: true
                },
                {
                    orcid: "0000-0008-9012-3456",
                    name: "Prof. Thomas Reed",
                    location: "Boston, USA",
                    employment: "Harvard University",
                    keywords: ["digital humanities", "GIS", "spatial analysis", "computational archaeology"],
                    orcidUrl: "https://orcid.org/0000-0008-9012-3456",
                    isDemo: true
                }
            ];
            
            // Set cache timestamp to 3 hours ago
            self.cache.timestamp = new Date().getTime() - (3 * 60 * 60 * 1000);
            self.saveToCache();
            self.displayResearchers();
        }, 1500);
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        var searchInput = document.getElementById('searchInput');
        var clearFilter = document.getElementById('clearFilter');
        var self = this;
        
        searchInput.addEventListener('input', function(e) {
            self.filterResearchers(e.target.value.toLowerCase());
        });
        
        clearFilter.addEventListener('click', function() {
            self.clearFilter();
        });
    },
    
    // Filter by keyword
    filterByKeyword: function(keyword) {
        this.activeFilter = keyword;
        this.applyFilters();
    },
    
    // Clear active filter
    clearFilter: function() {
        this.activeFilter = null;
        this.applyFilters();
    },
    
    // Apply all filters (search + keyword filter)
    applyFilters: function() {
        var searchQuery = document.getElementById('searchInput').value.toLowerCase();
        var self = this;
        
        this.filteredResearchers = [];
        
        for (var i = 0; i < this.researchers.length; i++) {
            var researcher = this.researchers[i];
            
            // Apply search filter
            var matchesSearch = !searchQuery || 
                researcher.name.toLowerCase().indexOf(searchQuery) !== -1 ||
                researcher.location.toLowerCase().indexOf(searchQuery) !== -1 ||
                researcher.employment.toLowerCase().indexOf(searchQuery) !== -1 ||
                (function() {
                    for (var j = 0; j < researcher.keywords.length; j++) {
                        if (researcher.keywords[j].toLowerCase().indexOf(searchQuery) !== -1) {
                            return true;
                        }
                    }
                    return false;
                })();
            
            // Apply keyword filter
            var matchesKeyword = !this.activeFilter || 
                researcher.keywords.indexOf(this.activeFilter) !== -1;
            
            if (matchesSearch && matchesKeyword) {
                this.filteredResearchers.push(researcher);
            }
        }
        
        this.displayFilteredResults();
        this.updateActiveFilterDisplay();
    },
    
    // Update active filter display
    updateActiveFilterDisplay: function() {
        var activeFilterEl = document.getElementById('activeFilter');
        var filterKeywordEl = document.getElementById('filterKeyword');
        
        if (this.activeFilter) {
            activeFilterEl.style.display = 'block';
            filterKeywordEl.textContent = this.activeFilter;
        } else {
            activeFilterEl.style.display = 'none';
        }
    },
    
    // Filter researchers based on search term
    filterResearchers: function(query) {
        this.applyFilters();
    },
    
    // Update the results count display
    updateResultsCount: function() {
        var countElement = document.getElementById('resultsCount');
        if (this.researchers.length === 0) {
            countElement.textContent = 'Loading archaeologists...';
        } else if (this.filteredResearchers.length === 1) {
            countElement.textContent = '1 archaeologist found';
        } else {
            countElement.textContent = this.filteredResearchers.length + ' archaeologists found';
        }
    },
    
    // Display all researchers
    displayResearchers: function() {
        this.filteredResearchers = [];
        for (var i = 0; i < this.researchers.length; i++) {
            this.filteredResearchers.push(this.researchers[i]);
        }
        this.displayFilteredResults();
    },
    
    // Display filtered researchers
    displayFilteredResults: function() {
        this.updateResultsCount();
        
        var container = document.getElementById('researchersContainer');
        container.innerHTML = '';
        
        if (this.filteredResearchers.length === 0 && this.researchers.length > 0) {
            container.innerHTML = ''
                + '<div class="no-results">'
                + '    <p>No archaeologists found matching your filters.</p>'
                + '    <p style="font-size: 13px; margin-top: 10px;">'
                + '        <a href="#" onclick="OrcidArchaeologistsIndex.clearFilter()" style="color: var(--primary-color); text-decoration: none;">'
                + '            Clear all filters'
                + '        </a>'
                + '    </p>'
                + '</div>';
            return;
        }
        
        if (this.researchers.length === 0) {
            container.innerHTML = ''
                + '<div class="no-results">'
                + '    <p>No archaeologists found in ORCID database.</p>'
                + '</div>';
            return;
        }
        
        // Create researcher cards
        var self = this;
        for (var i = 0; i < this.filteredResearchers.length; i++) {
            var researcher = this.filteredResearchers[i];
            var card = self.createResearcherCard(researcher);
            container.appendChild(card);
        }
        
        // Add subtle staggered fade-in animation
        var cards = container.querySelectorAll('.researcher-card');
        for (var i = 0; i < cards.length; i++) {
            (function(index) {
                setTimeout(function() {
                    cards[index].style.opacity = '1';
                    cards[index].style.transform = 'translateY(0)';
                }, 50 * index);
            })(i);
        }
    },
    
    // Display error message
    displayError: function() {
        var container = document.getElementById('researchersContainer');
        container.innerHTML = ''
            + '<div class="no-results">'
            + '    <p>Error loading archaeologists from ORCID. Please try again later.</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Note: ORCID API has rate limits and may be temporarily unavailable.</p>'
            + '</div>';
        document.getElementById('resultsCount').textContent = '';
    },
    
    // Display no results message
    displayNoResults: function() {
        var container = document.getElementById('researchersContainer');
        container.innerHTML = ''
            + '<div class="no-results">'
            + '    <p>No archaeologists found in ORCID database.</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Try broadening your search or check back later.</p>'
            + '</div>';
        document.getElementById('resultsCount').textContent = '0 archaeologists found';
    },
    
    // Create a researcher card element
    createResearcherCard: function(researcher) {
        var card = document.createElement('div');
        card.className = 'researcher-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        var self = this;
        
        // Create keywords HTML with click handlers
        var keywordsHtml = '';
        if (researcher.keywords.length > 0) {
            for (var i = 0; i < researcher.keywords.length; i++) {
                var keyword = researcher.keywords[i];
                keywordsHtml += '<span class="keyword-tag" onclick="OrcidArchaeologistsIndex.filterByKeyword(\'' + keyword + '\')">' + keyword + '</span>';
            }
        } else {
            keywordsHtml = '<span class="keyword-tag">Specialized in archaeology</span>';
        }
        
        // Determine if this is a demo record
        var demoBadge = researcher.isDemo ? '<span class="demo-badge">Demo</span>' : '';
        
        card.innerHTML = ''
            + '<div class="card-content">'
            + '    <h3 class="researcher-name">' + researcher.name + demoBadge + '</h3>'
            + '    <div class="researcher-details">'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-map-marker-alt"></i>'
            + '            <span>' + researcher.location + '</span>'
            + '        </div>'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-building"></i>'
            + '            <span>' + researcher.employment + '</span>'
            + '        </div>'
            + '    </div>'
            + '    <div class="keywords-container">'
            + '        <div class="keywords-title">Research Interests</div>'
            + '        <div class="keywords-list">'
            + '            ' + keywordsHtml
            + '        </div>'
            + '    </div>'
            + '</div>'
            + '<a href="' + researcher.orcidUrl + '" target="_blank" class="profile-link">'
            + '    View ORCID Profile <i class="fas fa-external-link-alt"></i>'
            + '</a>';
        
        return card;
    }
};

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    OrcidArchaeologistsIndex.init();
});