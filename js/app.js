// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    researchers: [],
    filteredResearchers: [],
    activeFilter: null,
    searchTimeout: null,
    currentPage: 1,
    pageSize: 20,
    totalResults: 0,
    
    // Initialize the application
    init: function() {
        this.showLoading();
        this.loadFromCache();
        this.fetchResearchers(1);
        this.setupEventListeners();
        this.updateCacheInfo();
    },
    
    // Show loading spinner
    showLoading: function() {
        var resultsCount = document.getElementById('resultsCount');
        var container = document.getElementById('researchersContainer');
        
        resultsCount.textContent = '';
        
        container.innerHTML = ''
            + '<div class="loading">'
            + '    <div class="spinner"></div>'
            + '    <p style="margin-top: 20px;">Loading archaeology researchers from ORCID...</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Fetching data from the ORCID Public API</p>'
            + '</div>';
    },
    
    // Load data from cache if available and not expired
    loadFromCache: function() {
        try {
            var cachedData = localStorage.getItem('orcid_archaeology_cache');
            if (cachedData) {
                var cache = JSON.parse(cachedData);
                var now = new Date().getTime();
                
                // Check if cache is still valid
                if (cache.timestamp && (now - cache.timestamp) < this.cache.ttl) {
                    this.researchers = cache.data;
                    this.displayResearchers();
                    console.log('Loaded researchers from cache');
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
                 this.researchers,
                timestamp: new Date().getTime()
            };
            localStorage.setItem('orcid_archaeology_cache', JSON.stringify(cacheData));
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
    
    // Fetch researchers from ORCID Public API
    fetchResearchers: function(page) {
        var self = this;
        this.showLoading();
        
        // Update current page
        if (page) {
            this.currentPage = page;
        }
        
        // Get search query
        var searchInput = document.getElementById('searchInput');
        var searchQuery = searchInput ? searchInput.value || 'archaeology' : 'archaeology';
        
        // Build URL with pagination parameters
        var baseUrl = 'https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists';
        var url = baseUrl + '?q=' + encodeURIComponent(searchQuery) + '&page=' + this.currentPage + '&rows=' + this.pageSize;
        
        console.log('Fetching researchers from:', url);
        
        fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                console.log('Received data:', data);
                self.researchers = data.result || [];
                self.totalResults = data.totalResults || 0;
                self.displayResearchers();
                self.saveToCache();
                self.updatePagination();
            })
            .catch(function(error) {
                console.error('Error fetching researchers:', error);
                self.displayError();
            });
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        var searchInput = document.getElementById('searchInput');
        var clearFilter = document.getElementById('clearFilter');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var self = this;
        
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                clearTimeout(self.searchTimeout);
                self.searchTimeout = setTimeout(function() {
                    self.fetchResearchers(1); // Reset to first page on search
                }, 300);
            });
        }
        
        if (clearFilter) {
            clearFilter.addEventListener('click', function() {
                if (searchInput) {
                    searchInput.value = '';
                }
                self.fetchResearchers(1);
            });
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', function() {
                if (self.currentPage > 1) {
                    self.fetchResearchers(self.currentPage - 1);
                }
            });
        }
        
        if (nextButton) {
            nextButton.addEventListener('click', function() {
                var totalPages = Math.ceil(self.totalResults / self.pageSize);
                if (self.currentPage < totalPages) {
                    self.fetchResearchers(self.currentPage + 1);
                }
            });
        }
    },
    
    // Update pagination controls
    updatePagination: function() {
        var paginationContainer = document.getElementById('paginationContainer');
        var pageInfo = document.getElementById('pageInfo');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        
        if (!paginationContainer || !pageInfo || !prevButton || !nextButton) {
            return;
        }
        
        if (this.totalResults > this.pageSize) {
            paginationContainer.style.display = 'flex';
            
            var totalPages = Math.ceil(this.totalResults / this.pageSize);
            var startRecord = ((this.currentPage - 1) * this.pageSize) + 1;
            var endRecord = Math.min(this.currentPage * this.pageSize, this.totalResults);
            
            pageInfo.textContent = 'Displaying ' + startRecord + ' - ' + endRecord + ' of ' + this.totalResults + ' researchers';
            
            // Update button states
            prevButton.disabled = (this.currentPage <= 1);
            nextButton.disabled = (this.currentPage >= totalPages);
        } else {
            paginationContainer.style.display = 'none';
        }
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
        
        if (this.activeFilter && activeFilterEl && filterKeywordEl) {
            activeFilterEl.style.display = 'block';
            filterKeywordEl.textContent = this.activeFilter;
        } else if (activeFilterEl) {
            activeFilterEl.style.display = 'none';
        }
    },
    
    // Update the results count display
    updateResultsCount: function() {
        var countElement = document.getElementById('resultsCount');
        if (countElement) {
            if (this.researchers.length === 0) {
                countElement.textContent = 'Loading researchers...';
            } else if (this.filteredResearchers.length === 1) {
                countElement.textContent = '1 archaeology researcher found';
            } else {
                countElement.textContent = this.filteredResearchers.length + ' archaeology researchers found';
            }
        }
    },
    
    // Display all researchers
    displayResearchers: function() {
        this.filteredResearchers = [].concat(this.researchers);
        this.displayFilteredResults();
    },
    
    // Display filtered researchers
    displayFilteredResults: function() {
        this.updateResultsCount();
        
        var container = document.getElementById('researchersContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.filteredResearchers.length === 0 && this.researchers.length > 0) {
            container.innerHTML = ''
                + '<div class="no-results">'
                + '    <p>No researchers found matching your filters.</p>'
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
                + '    <p>No archaeology researchers found in ORCID database.</p>'
                + '</div>';
            return;
        }
        
        // Create researcher tiles
        var self = this;
        for (var i = 0; i < this.filteredResearchers.length; i++) {
            var researcher = this.filteredResearchers[i];
            var tile = self.createResearcherTile(researcher);
            container.appendChild(tile);
        }
        
        // Add subtle staggered fade-in animation
        var tiles = container.querySelectorAll('.researcher-tile');
        for (var i = 0; i < tiles.length; i++) {
            (function(index) {
                setTimeout(function() {
                    if (tiles[index]) {
                        tiles[index].style.opacity = '1';
                        tiles[index].style.transform = 'translateY(0)';
                    }
                }, 50 * index);
            })(i);
        }
    },
    
    // Display error message
    displayError: function() {
        var container = document.getElementById('researchersContainer');
        if (!container) return;
        
        container.innerHTML = ''
            + '<div class="no-results">'
            + '    <p>Error loading researchers from ORCID. Please try again later.</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Note: ORCID API has rate limits and may be temporarily unavailable.</p>'
            + '</div>';
        var resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = '';
        }
    },
    
    // Create a researcher tile element
    createResearcherTile: function(researcher) {
        var tile = document.createElement('div');
        tile.className = 'researcher-tile';
        tile.style.opacity = '0';
        tile.style.transform = 'translateY(10px)';
        tile.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Create keywords HTML with click handlers
        var keywordsHtml = '';
        if (researcher.keywords && researcher.keywords.length > 0) {
            for (var i = 0; i < researcher.keywords.length; i++) {
                var keyword = researcher.keywords[i];
                // Escape single quotes for JavaScript
                var escapedKeyword = keyword.replace(/'/g, "\\'");
                keywordsHtml += '<span class="keyword-tag" onclick="OrcidArchaeologistsIndex.filterByKeyword(\'' + escapedKeyword + '\')">' + keyword + '</span>';
            }
        } else {
            keywordsHtml = '<span class="keyword-tag">Specialized in archaeology</span>';
        }
        
        // Determine if this is a demo record
        var demoBadge = researcher.isDemo ? '<span class="demo-badge">Demo</span>' : '';
        
        tile.innerHTML = ''
            + '<div class="tile-content">'
            + '    <h3 class="researcher-name">' + researcher.name + demoBadge + '</h3>'
            + '    <div class="researcher-details">'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-map-marker-alt"></i>'
            + '            <span>' + (researcher.location || 'Location not available') + '</span>'
            + '        </div>'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-building"></i>'
            + '            <span>' + (researcher.employment || 'Affiliation not available') + '</span>'
            + '        </div>'
            + '    </div>'
            + '    <div class="keywords-container">'
            + '        <div class="keywords-title">Research Interests</div>'
            + '        <div class="keywords-list">'
            + '            ' + keywordsHtml
            + '        </div>'
            + '    </div>'
            + '</div>'
            + '<a href="' + (researcher.orcidUrl || '#') + '" target="_blank" class="profile-link">'
            + '    View ORCID Profile <i class="fas fa-external-link-alt"></i>'
            + '</a>';
        
        return tile;
    }
};

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    OrcidArchaeologistsIndex.init();
});