# Index of ORCID Archaeologists

## Project Description

This web application provides a searchable and paginated index of archaeologists and related researchers who have public profiles on [ORCID](https://orcid.org/). The goal is to create a simple, fast, and user-friendly interface to explore this dataset. The front-end is a static site built with HTML, CSS, and vanilla JavaScript, hosted on GitHub Pages. The back-end is powered by two serverless functions hosted on DigitalOcean that act as a proxy and data processor for the official ORCID Public API.

This project also acted as a test for Google Jules - to see how efficient it was in code reviews and bug fixes (especially in regard to how much human in the loop exists in its process)

## Features

*   **Dynamic Search:** Search for researchers by keyword. The search is debounced for a smooth user experience and queries the ORCID API in real-time.
*   **Paginated Results:** Browse through search results page by page. The application displays 50 records per page.
*   **Stable Pagination Window:** The pagination is stable and reliable for the first 1000 search results, preventing duplicate records from appearing on different pages.
*   **Detailed Researcher Cards:** Each researcher is displayed on a card with their name, affiliation, location, and research interests.
*   **Robust Data Extraction:**
    *   **Location:** Intelligently finds the best available location data, falling back from a researcher's primary address to their most recent employment address.
    *   **Keywords:** Automatically parses and separates keywords, even when they are delimited by a variety of characters (commas, dashes, semicolons).
*   **Limited Keyword Display:** Shows the top 5 keywords for a clean UI, with a "view more" link that directs to the researcher's full ORCID profile for more details.

## Challenges & Compromises

A significant technical challenge in this project was the nature of the ORCID Public API's search functionality. The API does not provide a stable, guaranteed sort order for search results. This makes true pagination (i.e., navigating through all 30,000+ potential results) impossible, as requesting "page 2" could return records that were already seen on "page 1".

To solve this, a pragmatic compromise was implemented:

*   **The 1000-Record Window:** The back-end function fetches the top 1000 results from the ORCID API in a single, initial query. This list is stable for the duration of the user's search. The application then performs pagination against this stable "window" of 1000 records.
*   **Trade-Off:** This provides a fast, reliable, and stable user experience for the first 20 pages of results. While this doesn't expose the entire dataset, it covers the vast majority of user sessions while staying within the technical and performance constraints of a serverless architecture. A "perfect" solution would require a much more complex and expensive system involving a dedicated database and a background worker to synchronize all 30,000+ records.
