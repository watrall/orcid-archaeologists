// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    researchers: [],
    currentPage: 1,
    pageSize: 20,
    totalResults: 0,
    currentQuery: 'archaeology',
    debounceTimer: null,

    // Initialize the application
    init: function() {
        this.showLoading();
        this.fetchResearchers(this.currentQuery, this.currentPage);
        this.setupEventListeners();
    },

    // Debounce function to limit API calls
    debounce: function(func, delay) {
        var self = this;
        return function() {
            var context = this;
            var args = arguments;
            clearTimeout(self.debounceTimer);
            self.debounceTimer = setTimeout(function() {
                func.apply(context, args);
            }, delay);
        };
    },

    // Show loading spinner
    showLoading: function() {
        var resultsCount = document.getElementById('resultsCount');
        var container = document.getElementById('researchersContainer');
        
        resultsCount.textContent = '';
        
        container.innerHTML = ''
            + '<div class="loading">'
            + '    <div class="spinner"></div>'
            + '    <p style="margin-top: 20px;">Loading researchers from ORCID...</p>'
            + '    <p style="font-size: 13px; margin-top: 10px;">Fetching data from the ORCID Public API</p>'
            + '</div>';
    },
    
    // Fetch researchers from ORCID Public API
    fetchResearchers: function(query, page) {
        var self = this;
        this.showLoading();
        self.currentQuery = query;
        self.currentPage = page;

        var url = `https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists?q=${encodeURIComponent(query)}&page=${page}&rows=${this.pageSize}`;
        
        fetch(url)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Network response was not ok: ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                self.researchers = data.result || [];
                self.totalResults = data['num-found'] || 0;
                self.displayResults();
            })
            .catch(function(error) {
                console.error('Error fetching researchers:', error);
                self.displayError();
            });
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        var searchInput = document.getElementById('searchInput');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var self = this;
        
        searchInput.addEventListener('input', this.debounce(function(e) {
            var query = e.target.value.toLowerCase();
            if (query.length === 0 || query.length > 2) {
                self.fetchResearchers(query || 'archaeology', 1);
            }
        }, 500));

        prevButton.addEventListener('click', function() {
            if (self.currentPage > 1) {
                self.fetchResearchers(self.currentQuery, self.currentPage - 1);
            }
        });

        nextButton.addEventListener('click', function() {
            var totalPages = Math.ceil(self.totalResults / self.pageSize);
            if (self.currentPage < totalPages) {
                self.fetchResearchers(self.currentQuery, self.currentPage + 1);
            }
        });
    },
    
    // Display results
    displayResults: function() {
        var self = this;
        var container = document.getElementById('researchersContainer');
        var resultsCount = document.getElementById('resultsCount');
        
        // Update results count
        if (this.totalResults === 1) {
            resultsCount.textContent = '1 researcher found';
        } else {
            resultsCount.textContent = this.totalResults + ' researchers found';
        }
        
        container.innerHTML = '';
        
        if (this.researchers.length === 0) {
            container.innerHTML = ''
                + '<div class="no-results">'
                + '    <p>No researchers found matching your search.</p>'
                + '</div>';
            this.updatePagination();
            return;
        }
        
        // Create researcher cards
        for (var i = 0; i < this.researchers.length; i++) {
            var researcher = this.researchers[i];
            var card = this.createResearcherCard(researcher);
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
        this.updatePagination();
    },

    // Update pagination controls
    updatePagination: function() {
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var pageInfo = document.getElementById('pageInfo');
        var paginationContainer = document.getElementById('paginationContainer');

        var totalPages = Math.ceil(this.totalResults / this.pageSize);

        if (totalPages > 1) {
            paginationContainer.style.display = 'flex';
            pageInfo.textContent = `Page ${this.currentPage} of ${totalPages}`;
            prevButton.disabled = this.currentPage === 1;
            nextButton.disabled = this.currentPage === totalPages;
        } else {
            paginationContainer.style.display = 'none';
        }
    },
    
    // Display error message
    displayError: function() {
        var container = document.getElementById('researchersContainer');
        var resultsCount = document.getElementById('resultsCount');
        
        container.innerHTML = ''
            + '<div class="no-results">'
            + '    <p>Error loading researchers from ORCID. Please try again later.</p>'
            + '</div>';
        
        resultsCount.textContent = '';
    },
    
    // Create a researcher card element
    createResearcherCard: function(researcher) {
        var card = document.createElement('div');
        card.className = 'researcher-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Create keywords HTML - now displays a default message as keywords are not available
        var keywordsHtml = '<span class="keyword-tag">Research interests not available</span>';
        
        card.innerHTML = ''
            + '<div class="card-content">'
            + '    <h3 class="researcher-name">' + (researcher.name || 'Name not available') + '</h3>'
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
        
        return card;
    }
};

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    OrcidArchaeologistsIndex.init();
});