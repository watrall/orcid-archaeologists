// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    researchers: [],
    filteredResearchers: [],
    activeFilter: null,
    searchTimeout: null,
    currentPage: 1,
    pageSize: 50,
    totalResults: 0,
    
    // Initialize the application
    init: function() {
        this.fetchResearchers(1); // Fetch the first page on init
        this.setupEventListeners();
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
    
    
    // Fetch researchers using the serverless function
    fetchResearchers: function(page, query) {
        var self = this;
        this.showLoading();
        this.currentPage = page;
        
        var searchQuery = query || document.getElementById('searchInput').value || 'archaeology';

        var url = new URL('https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists');
        url.searchParams.append('q', searchQuery);
        url.searchParams.append('page', this.currentPage);
        url.searchParams.append('rows', this.pageSize);

        fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                self.researchers = data.result || [];
                self.totalResults = data.totalResults || 0;
                self.displayResearchers();
                self.updatePagination();
            })
            .catch(function(error) {
                console.error('Error fetching researchers:', error);
                self.displayError();
            });
    },
   
    // Setup event listeners
    setupEventListeners: function() {
        var self = this;
        var searchInput = document.getElementById('searchInput');
        var clearFilter = document.getElementById('clearFilter');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');

        searchInput.addEventListener('input', function(e) {
            clearTimeout(self.searchTimeout);
            self.searchTimeout = setTimeout(function() {
                self.fetchResearchers(1); // On new search, always go to page 1
            }, 500); // Debounce search input
        });
        
        clearFilter.addEventListener('click', function() {
            self.clearFilter();
        });

        prevButton.addEventListener('click', function() {
            if (self.currentPage > 1) {
                self.fetchResearchers(self.currentPage - 1);
            }
        });

        nextButton.addEventListener('click', function() {
            var totalPages = Math.ceil(self.totalResults / self.pageSize);
            if (self.currentPage < totalPages) {
                self.fetchResearchers(self.currentPage + 1);
            }
        });
    },

    updatePagination: function() {
        var paginationContainer = document.getElementById('paginationContainer');
        var pageInfo = document.getElementById('pageInfo');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');

        if (this.totalResults > 0) {
            paginationContainer.style.display = 'block';
            var totalPages = Math.ceil(this.totalResults / this.pageSize);
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;

            prevButton.disabled = this.currentPage === 1;
            nextButton.disabled = this.currentPage === totalPages;
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
        if (this.totalResults > 0) {
            var startRecord = ((this.currentPage - 1) * this.pageSize) + 1;
            var endRecord = Math.min(this.currentPage * this.pageSize, this.totalResults);
            countElement.textContent = `Displaying ${startRecord} - ${endRecord} of ${this.totalResults} Archaeologists on ORCID`;
        } else if (this.researchers.length === 0) {
            countElement.textContent = 'No archaeologists found matching your search.';
        } else {
            countElement.textContent = ''; // Hide while loading
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
        var maxKeywords = 5;
        if (researcher.keywords.length > 0) {
            var keywordsToShow = researcher.keywords.slice(0, maxKeywords);
            for (var i = 0; i < keywordsToShow.length; i++) {
                var keyword = keywordsToShow[i];
                // Escape keyword for use in a JavaScript string literal within an HTML attribute
                var keywordForJs = keyword.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                // Escape keyword for display as HTML text content
                var keywordForHtml = keyword.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

                keywordsHtml += '<span class="keyword-tag" onclick="OrcidArchaeologistsIndex.filterByKeyword(\'' + keywordForJs + '\')">' + keywordForHtml + '</span>';
            }

            if (researcher.keywords.length > maxKeywords) {
                keywordsHtml += '<a href="' + researcher.orcidUrl + '" target="_blank" class="view-more-tag">view more...</a>';
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
