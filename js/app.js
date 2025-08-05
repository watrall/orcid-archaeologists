// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    researchers: [],
    filteredResearchers: [],
    activeFilter: null,
    currentPage: 1,
    pageSize: 20,
    totalResults: 0,
    
    // Initialize the application
    init: function() {
        this.showLoading();
        this.fetchResearchers();
        this.setupEventListeners();
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
    
    // Fetch researchers from ORCID Public API
    fetchResearchers: function() {
        var self = this;
        this.showLoading();
        
        // Call your DigitalOcean Function
        var url = 'https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists';
        
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
                self.displayResearchers();
            })
            .catch(function(error) {
                console.error('Error fetching researchers:', error);
                self.displayError();
            });
    },
    
    // Setup event listeners
    setupEventListeners: function() {
        var searchInput = document.getElementById('searchInput');
        var self = this;
        
        searchInput.addEventListener('input', function(e) {
            self.filterResearchers(e.target.value.toLowerCase());
        });
    },
    
    // Filter researchers based on search term
    filterResearchers: function(query) {
        var self = this;
        this.filteredResearchers = [];
        
        if (!query) {
            this.filteredResearchers = [].concat(this.researchers);
        } else {
            for (var i = 0; i < this.researchers.length; i++) {
                var researcher = this.researchers[i];
                
                // Check if query matches any field
                var matches = false;
                
                // Check name
                if (researcher.name && researcher.name.toLowerCase().indexOf(query) !== -1) {
                    matches = true;
                }
                
                // Check location
                if (researcher.location && researcher.location.toLowerCase().indexOf(query) !== -1) {
                    matches = true;
                }
                
                // Check employment
                if (researcher.employment && researcher.employment.toLowerCase().indexOf(query) !== -1) {
                    matches = true;
                }
                
                // Check keywords
                if (researcher.keywords) {
                    for (var j = 0; j < researcher.keywords.length; j++) {
                        if (researcher.keywords[j].toLowerCase().indexOf(query) !== -1) {
                            matches = true;
                            break;
                        }
                    }
                }
                
                if (matches) {
                    this.filteredResearchers.push(researcher);
                }
            }
        }
        
        this.displayFilteredResults();
    },
    
    // Display all researchers
    displayResearchers: function() {
        this.filteredResearchers = [].concat(this.researchers);
        this.displayFilteredResults();
    },
    
    // Display filtered researchers
    displayFilteredResults: function() {
        var self = this;
        var container = document.getElementById('researchersContainer');
        var resultsCount = document.getElementById('resultsCount');
        
        // Update results count
        if (this.filteredResearchers.length === 1) {
            resultsCount.textContent = '1 archaeology researcher found';
        } else {
            resultsCount.textContent = this.filteredResearchers.length + ' archaeology researchers found';
        }
        
        container.innerHTML = '';
        
        if (this.filteredResearchers.length === 0) {
            container.innerHTML = ''
                + '<div class="no-results">'
                + '    <p>No researchers found matching your search.</p>'
                + '</div>';
            return;
        }
        
        // Create researcher cards
        for (var i = 0; i < this.filteredResearchers.length; i++) {
            var researcher = this.filteredResearchers[i];
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
        
        // Create keywords HTML
        var keywordsHtml = '';
        if (researcher.keywords && researcher.keywords.length > 0) {
            for (var i = 0; i < researcher.keywords.length; i++) {
                var keyword = researcher.keywords[i];
                // Escape single quotes for JavaScript
                var escapedKeyword = keyword.replace(/'/g, "\\'");
                keywordsHtml += '<span class="keyword-tag" onclick="OrcidArchaeologistsIndex.filterResearchers(\'' + escapedKeyword + '\')">' + keyword + '</span>';
            }
        } else {
            keywordsHtml = '<span class="keyword-tag">Specialized in archaeology</span>';
        }
        
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