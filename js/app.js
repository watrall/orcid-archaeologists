(function() {
    'use strict';

    var CONFIG = {
        SERVERLESS_URL: 'https://faas-nyc1-2ef2e6cc.doserverless.co/api/v1/web/fn-6a9a946f-8359-46a3-ab53-3db991adfde7/default/search-archaeologists',
        DEBOUNCE_DELAY: 500,
        PAGE_SIZE: 20,
        ANIMATION_STAGGER_MS: 50,
        DEFAULT_QUERY: 'archaeology',
        MAX_KEYWORDS_DISPLAY: 5
    };

    var DOM = {
        searchInput: null,
        resultsCount: null,
        container: null,
        prevButton: null,
        nextButton: null,
        pageInfo: null,
        paginationContainer: null
    };

    function escapeHtml(text) {
        if (text == null) return '';
        var div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function sanitizeUrl(url) {
        if (!url) return '#';
        var trimmed = String(url).trim();
        if (trimmed.indexOf('https://') === 0 || trimmed.indexOf('http://') === 0) {
            return trimmed;
        }
        return '#';
    }

    var App = {
        allResearchers: [],
        filteredResearchers: [],
        currentPage: 1,
        totalResults: 0,
        currentQuery: CONFIG.DEFAULT_QUERY,
        debounceTimer: null,

        init: function() {
            this.cacheElements();
            this.showLoading();
            this.searchResearchers(this.currentQuery);
            this.bindEvents();
        },

        cacheElements: function() {
            DOM.searchInput = document.getElementById('searchInput');
            DOM.resultsCount = document.getElementById('resultsCount');
            DOM.container = document.getElementById('researchersContainer');
            DOM.prevButton = document.getElementById('prevButton');
            DOM.nextButton = document.getElementById('nextButton');
            DOM.pageInfo = document.getElementById('pageInfo');
            DOM.paginationContainer = document.getElementById('paginationContainer');
        },

        bindEvents: function() {
            var self = this;

            DOM.searchInput.addEventListener('input', function(e) {
                self.handleSearchInput(e.target.value);
            });

            DOM.prevButton.addEventListener('click', function() {
                if (self.currentPage > 1) {
                    self.displayPage(self.currentPage - 1);
                }
            });

            DOM.nextButton.addEventListener('click', function() {
                var totalPages = Math.ceil(self.filteredResearchers.length / CONFIG.PAGE_SIZE);
                if (self.currentPage < totalPages) {
                    self.displayPage(self.currentPage + 1);
                }
            });
        },

        handleSearchInput: function(value) {
            var self = this;
            var query = value.trim().toLowerCase() || CONFIG.DEFAULT_QUERY;

            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(function() {
                self.searchResearchers(query);
            }, CONFIG.DEBOUNCE_DELAY);
        },

        showLoading: function(message) {
            DOM.resultsCount.textContent = '';
            DOM.container.innerHTML = '';

            var loading = document.createElement('div');
            loading.className = 'loading';

            var spinner = document.createElement('div');
            spinner.className = 'spinner';

            var text = document.createElement('p');
            text.style.marginTop = '20px';
            text.textContent = message || 'Loading researchers...';

            loading.appendChild(spinner);
            loading.appendChild(text);
            DOM.container.appendChild(loading);
        },

        searchResearchers: function(query) {
            var self = this;
            this.showLoading('Fetching researchers for "' + escapeHtml(query) + '"...');
            this.currentQuery = query;

            var url = CONFIG.SERVERLESS_URL + '?mode=search&q=' + encodeURIComponent(query) + '&rows=1000';

            fetch(url)
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(function(data) {
                    if (!data || typeof data !== 'object') {
                        throw new Error('Invalid response format');
                    }
                    self.allResearchers = Array.isArray(data.result) ? data.result : [];
                    self.totalResults = data['num-found'] || 0;
                    self.filteredResearchers = self.allResearchers;
                    self.currentPage = 1;
                    self.displayPage(1);
                })
                .catch(function(error) {
                    console.error('Search error:', error);
                    self.displayError('Failed to fetch researcher list. Please try again.');
                });
        },

        displayPage: function(page) {
            this.currentPage = page;
            DOM.container.innerHTML = '';
            this.showLoading('Fetching researcher details...');

            var start = (page - 1) * CONFIG.PAGE_SIZE;
            var end = start + CONFIG.PAGE_SIZE;
            var pageResearchers = this.filteredResearchers.slice(start, end);

            this.updatePagination();
            this.fetchDetails(pageResearchers);
        },

        fetchDetails: function(researchers) {
            var self = this;

            if (!researchers || researchers.length === 0) {
                this.displayResults([]);
                return;
            }

            var orcidIds = [];
            for (var i = 0; i < researchers.length; i++) {
                var r = researchers[i];
                if (r && r.orcidUrl && typeof r.orcidUrl === 'string') {
                    var parts = r.orcidUrl.split('/');
                    var id = parts[parts.length - 1];
                    if (id) {
                        orcidIds.push(id);
                    }
                }
            }

            if (orcidIds.length === 0) {
                this.displayResults([]);
                return;
            }

            fetch(CONFIG.SERVERLESS_URL + '?mode=details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orcids: orcidIds })
            })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(function(data) {
                    var results = (data && Array.isArray(data.result)) ? data.result : [];
                    self.displayResults(results);
                })
                .catch(function(error) {
                    console.error('Details fetch error:', error);
                    self.displayError('Failed to fetch researcher details. Please try again.');
                });
        },

        displayResults: function(researchers) {
            var self = this;
            var startRecord = (this.currentPage - 1) * CONFIG.PAGE_SIZE + 1;
            var endRecord = startRecord + researchers.length - 1;

            DOM.container.innerHTML = '';

            if (!researchers || researchers.length === 0) {
                DOM.resultsCount.textContent = 'No researchers found matching your search.';
                var noResults = document.createElement('div');
                noResults.className = 'no-results';
                var p = document.createElement('p');
                p.textContent = 'No researchers found matching your search.';
                noResults.appendChild(p);
                DOM.container.appendChild(noResults);
                return;
            }

            DOM.resultsCount.textContent = 'Displaying records ' + startRecord + '-' + endRecord +
                ' of ' + this.filteredResearchers.length.toLocaleString();

            var fragment = document.createDocumentFragment();
            for (var i = 0; i < researchers.length; i++) {
                fragment.appendChild(this.createCard(researchers[i]));
            }
            DOM.container.appendChild(fragment);

            var cards = DOM.container.querySelectorAll('.researcher-card');
            for (var j = 0; j < cards.length; j++) {
                (function(card, index) {
                    setTimeout(function() {
                        card.classList.add('visible');
                    }, CONFIG.ANIMATION_STAGGER_MS * index);
                })(cards[j], j);
            }
        },

        updatePagination: function() {
            var totalPages = Math.ceil(this.filteredResearchers.length / CONFIG.PAGE_SIZE);

            if (totalPages > 1) {
                DOM.paginationContainer.style.display = 'flex';
                DOM.pageInfo.textContent = 'Page ' + this.currentPage + ' of ' + totalPages;
                DOM.prevButton.disabled = this.currentPage === 1;
                DOM.nextButton.disabled = this.currentPage === totalPages;
            } else {
                DOM.paginationContainer.style.display = 'none';
            }
        },

        displayError: function(message) {
            DOM.container.innerHTML = '';
            DOM.resultsCount.textContent = '';

            var errorDiv = document.createElement('div');
            errorDiv.className = 'no-results';
            var p = document.createElement('p');
            p.textContent = 'Error: ' + message;
            errorDiv.appendChild(p);
            DOM.container.appendChild(errorDiv);
        },

        parseKeywords: function(keywords) {
            if (!keywords || !Array.isArray(keywords)) return [];

            var parsed = [];
            for (var i = 0; i < keywords.length; i++) {
                var kw = keywords[i];
                if (typeof kw === 'string') {
                    var parts = kw.split(/[,;\-]\s*/);
                    for (var j = 0; j < parts.length; j++) {
                        var trimmed = parts[j].trim();
                        if (trimmed) {
                            parsed.push(trimmed);
                        }
                    }
                }
            }
            return parsed;
        },

        createCard: function(researcher) {
            var card = document.createElement('div');
            card.className = 'researcher-card';

            var content = document.createElement('div');
            content.className = 'card-content';

            var name = document.createElement('h3');
            name.className = 'researcher-name';
            name.textContent = researcher.name || 'Name not available';

            var details = document.createElement('div');
            details.className = 'researcher-details';

            var locationItem = this.createDetailItem('fa-map-marker-alt', researcher.location || 'Location not available');
            var employmentItem = this.createDetailItem('fa-building', researcher.employment || 'Affiliation not available');

            details.appendChild(locationItem);
            details.appendChild(employmentItem);

            var keywordsContainer = document.createElement('div');
            keywordsContainer.className = 'keywords-container';

            var keywordsTitle = document.createElement('div');
            keywordsTitle.className = 'keywords-title';
            keywordsTitle.textContent = 'Research Interests';

            var keywordsList = document.createElement('div');
            keywordsList.className = 'keywords-list';

            var parsedKeywords = this.parseKeywords(researcher.keywords);

            if (parsedKeywords.length === 0) {
                var noKeywords = document.createElement('span');
                noKeywords.className = 'keyword-tag';
                noKeywords.textContent = 'No research interests listed';
                keywordsList.appendChild(noKeywords);
            } else {
                var displayCount = Math.min(parsedKeywords.length, CONFIG.MAX_KEYWORDS_DISPLAY);
                for (var i = 0; i < displayCount; i++) {
                    var tag = document.createElement('span');
                    tag.className = 'keyword-tag';
                    tag.textContent = parsedKeywords[i];
                    keywordsList.appendChild(tag);
                }

                if (parsedKeywords.length > CONFIG.MAX_KEYWORDS_DISPLAY) {
                    var viewMore = document.createElement('a');
                    viewMore.className = 'view-more-keywords';
                    viewMore.href = sanitizeUrl(researcher.orcidUrl);
                    viewMore.target = '_blank';
                    viewMore.rel = 'noopener noreferrer';
                    viewMore.textContent = 'view more...';
                    keywordsList.appendChild(viewMore);
                }
            }

            keywordsContainer.appendChild(keywordsTitle);
            keywordsContainer.appendChild(keywordsList);

            content.appendChild(name);
            content.appendChild(details);
            content.appendChild(keywordsContainer);

            var profileLink = document.createElement('a');
            profileLink.className = 'profile-link';
            profileLink.href = sanitizeUrl(researcher.orcidUrl);
            profileLink.target = '_blank';
            profileLink.rel = 'noopener noreferrer';
            profileLink.textContent = 'View ORCID Profile ';

            var icon = document.createElement('i');
            icon.className = 'fas fa-external-link-alt';
            profileLink.appendChild(icon);

            card.appendChild(content);
            card.appendChild(profileLink);

            return card;
        },

        createDetailItem: function(iconClass, text) {
            var item = document.createElement('div');
            item.className = 'detail-item';

            var icon = document.createElement('i');
            icon.className = 'fas ' + iconClass;

            var span = document.createElement('span');
            span.textContent = text;

            item.appendChild(icon);
            item.appendChild(span);

            return item;
        }
    };

    document.addEventListener('DOMContentLoaded', function() {
        App.init();
    });
})();