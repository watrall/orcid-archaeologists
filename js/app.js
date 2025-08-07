// Main application module for Index of ORCID Archaeologists
var OrcidArchaeologistsIndex = {
    allResearchers: [],
    filteredResearchers: [],
    currentPage: 1,
    pageSize: 50,
    totalResults: 0,
    currentQuery: 'archaeology',
    debounceTimer: null,
    serverlessUrl: 'https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists',

    // Initialize the application
    init: function () {
        this.showLoading();
        this.searchResearchers(this.currentQuery);
        this.setupEventListeners();
    },

    // Debounce function to limit API calls
    debounce: function (func, delay) {
        var self = this;
        return function () {
            var context = this;
            var args = arguments;
            clearTimeout(self.debounceTimer);
            self.debounceTimer = setTimeout(function () {
                func.apply(context, args);
            }, delay);
        };
    },

    // Show loading spinner
    showLoading: function (message) {
        var resultsCount = document.getElementById('resultsCount');
        var container = document.getElementById('researchersContainer');
        resultsCount.textContent = '';
        container.innerHTML = `<div class="loading"><div class="spinner"></div><p style="margin-top: 20px;">${message || 'Loading researchers...'}</p></div>`;
    },

    // Search for researchers (API call)
    searchResearchers: function (query) {
        var self = this;
        this.showLoading(`Fetching researchers matching "${query}"...`);
        self.currentQuery = query;

        // Assume the serverless function can return full details for the search
        var url = `${this.serverlessUrl}?mode=search&q=${encodeURIComponent(query)}&rows=1000&details=true`;

        fetch(url)
            .then(response => response.json())
            .then(data => {
                // The server now returns full details, so we can store them directly
                self.allResearchers = data.result || [];
                self.totalResults = data['num-found'] || 0;
                self.filteredResearchers = self.allResearchers; // No initial client-side filter needed
                self.currentPage = 1;
                self.displayPage(1); // Display the first page of the new results
            })
            .catch(error => {
                console.error('Error searching researchers:', error);
                self.displayError('Failed to fetch researcher list.');
            });
    },

    // Filter results on the client-side
    clientSideFilter: function (query) {
        var self = this;
        if (!query) {
            this.filteredResearchers = this.allResearchers;
        } else {
            this.filteredResearchers = this.allResearchers.filter(function (researcher) {
                const name = (researcher.name || '').toLowerCase();
                const employment = (researcher.employment || '').toLowerCase();
                const keywords = (researcher.keywords || []).join(' ').toLowerCase();
                return name.includes(query) || employment.includes(query) || keywords.includes(query);
            });
        }
        this.currentPage = 1;
        this.displayPage(1);
    },

    // Display a specific page of results
    displayPage: function (page) {
        var self = this;
        this.currentPage = page;
        
        var start = (page - 1) * this.pageSize;
        var end = start + this.pageSize;
        var pageResearchers = this.filteredResearchers.slice(start, end);

        // No need to fetch details anymore, just display the results
        this.displayResults(pageResearchers);
        this.updatePagination();
    },
    
    // Setup event listeners
    setupEventListeners: function () {
        var searchInput = document.getElementById('searchInput');
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var self = this;

        // We are now using the search input to trigger a new search, not just a client-side filter.
        // The event listener will call searchResearchers.
        searchInput.addEventListener('input', this.debounce(function (e) {
            var query = e.target.value.toLowerCase();
            // If the query is empty, we could show the default 'archaeology' list,
            // or clear the results. Let's stick with the default for now.
            self.searchResearchers(query || 'archaeology');
        }, 500)); // Increased debounce time for API calls

        prevButton.addEventListener('click', function () {
            if (self.currentPage > 1) {
                self.displayPage(self.currentPage - 1);
            }
        });

        nextButton.addEventListener('click', function () {
            var totalPages = Math.ceil(self.filteredResearchers.length / self.pageSize);
            if (self.currentPage < totalPages) {
                self.displayPage(self.currentPage + 1);
            }
        });
    },

    // Display results
    displayResults: function (researchers) {
        var self = this;
        var container = document.getElementById('researchersContainer');
        var resultsCount = document.getElementById('resultsCount');

        resultsCount.textContent = `${this.filteredResearchers.length} of ${this.totalResults.toLocaleString()} researchers found`;
        
        container.innerHTML = '';

        if (researchers.length === 0) {
            container.innerHTML = '<div class="no-results"><p>No researchers found matching your search.</p></div>';
            return;
        }

        researchers.forEach(function (researcher) {
            var card = self.createResearcherCard(researcher);
            container.appendChild(card);
        });
        
        var cards = container.querySelectorAll('.researcher-card');
        cards.forEach(function(card, index) {
            setTimeout(function() {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 50 * index);
        });
    },

    // Update pagination controls
    updatePagination: function () {
        var prevButton = document.getElementById('prevButton');
        var nextButton = document.getElementById('nextButton');
        var pageInfo = document.getElementById('pageInfo');
        var paginationContainer = document.getElementById('paginationContainer');

        var totalPages = Math.ceil(this.filteredResearchers.length / this.pageSize);

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
    displayError: function (message) {
        var container = document.getElementById('researchersContainer');
        var resultsCount = document.getElementById('resultsCount');
        container.innerHTML = `<div class="no-results"><p>Error: ${message}</p></div>`;
        resultsCount.textContent = '';
    },

    // Create a researcher card element
    createResearcherCard: function (researcher) {
        var card = document.createElement('div');
        card.className = 'researcher-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(10px)';
        card.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

        var keywordsHtml = '<span class="keyword-tag">No research interests listed</span>';
        if (researcher.keywords && researcher.keywords.length > 0) {
            var topKeywords = researcher.keywords.slice(0, 5);
            keywordsHtml = topKeywords.map(k => `<span class="keyword-tag">${k}</span>`).join('');
            if (researcher.keywords.length > 5) {
                keywordsHtml += ` <a href="${researcher.orcidUrl}" target="_blank" class="view-more-keywords">view more...</a>`;
            }
        }

        card.innerHTML = ''
            + '<div class="card-content">'
            + `    <h3 class="researcher-name">${researcher.name || 'Name not available'}</h3>`
            + '    <div class="researcher-details">'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-map-marker-alt"></i>'
            + `            <span>${researcher.location || 'Location not available'}</span>`
            + '        </div>'
            + '        <div class="detail-item">'
            + '            <i class="fas fa-building"></i>'
            + `            <span>${researcher.employment || 'Affiliation not available'}</span>`
            + '        </div>'
            + '    </div>'
            + '    <div class="keywords-container">'
            + '        <div class="keywords-title">Research Interests</div>'
            + '        <div class="keywords-list">'
            + `            ${keywordsHtml}`
            + '        </div>'
            + '    </div>'
            + '</div>'
            + `<a href="${researcher.orcidUrl || '#'}" target="_blank" class="profile-link">`
            + '    View ORCID Profile <i class="fas fa-external-link-alt"></i>'
            + '</a>';

        return card;
    }
};

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', function() {
    OrcidArchaeologistsIndex.init();
});