const axios = require('axios');

/**
 * Main function for searching archaeologists on ORCID.
 * Handles CORS preflight requests and fetches data.
 */
exports.main = async function (event, context) {
  // Handle CORS preflight requests for browser compatibility
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*', // Allow any origin
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: ''
    };
  }

  try {
    // Log the incoming event for debugging
    console.log('Received event:', JSON.stringify(event));

    // Get search query from request parameters, default to 'archaeology'
    let query = 'archaeology';
    if (event && event.queryStringParameters && event.queryStringParameters.q) {
      query = event.queryStringParameters.q;
    }
    console.log('Search query:', query);

    // Check for required environment variable
    if (!process.env.TOKEN_FUNCTION_URL) {
      console.error('TOKEN_FUNCTION_URL not set');
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Get an access token from the token function
    console.log('Calling token function at:', process.env.TOKEN_FUNCTION_URL);
    const tokenResponse = await axios.get(process.env.TOKEN_FUNCTION_URL);
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('Failed to get access token from token function');
    }
    const accessToken = tokenResponse.data.access_token;
    console.log('Got access token successfully');

    // Search the ORCID API
    const encodedQuery = encodeURIComponent(query);
    const searchUrl = `https://pub.orcid.org/v3.0/search/?q=${encodedQuery}&start=0&rows=20`;
    console.log('Searching ORCID at:', searchUrl);
    const searchResponse = await axios.get(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    console.log('ORCID search completed, status:', searchResponse.status);

    // Fetch detailed records for each search result in parallel
    const searchResults = searchResponse.data.result || [];
    const limitedResults = searchResults.slice(0, 10);

    const recordPromises = limitedResults.map(item => {
      const orcid = item['orcid-identifier'].path;
      const recordUrl = `https://pub.orcid.org/v3.0/${orcid}/record`;
      return axios.get(recordUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }).catch(err => {
        console.error(`Error fetching record for ORCID ${orcid}:`, err.message);
        return null; // Return null for failed requests so Promise.all doesn't fail
      });
    });

    const recordResponses = await Promise.all(recordPromises);

    // Process the results, filtering out any failed requests or invalid data
    const researchers = recordResponses
      .filter(response => response && response.data)
      .map(response => extractResearcherData(response.data))
      .filter(researcher => researcher !== null);

    // Return the final data in the format expected by the frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: researchers, // Use 'result' property for frontend compatibility
        totalResults: searchResponse.data['num-found'] || 0
      })
    };
  } catch (error) {
    console.error('Error in search function:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Failed to search ORCID',
        details: error.message
      })
    };
  }
};

/**
 * Helper function to extract and format researcher data from an ORCID record.
 */
function extractResearcherData(data) {
  try {
    if (!data || !data['orcid-identifier']) return null;

    const orcidId = data['orcid-identifier'].path;
    const orcidUrl = data['orcid-identifier'].uri;

    let name = "Name not available";
    if (data.person && data.person.name) {
      const givenNames = data.person.name['given-names']?.value || '';
      const familyName = data.person.name['family-name']?.value || '';
      name = `${givenNames} ${familyName}`.trim() || "Name not available";
    }

    let employment = "Affiliation not available";
    if (data['activities-summary']?.employments?.['affiliation-group']?.[0]?.summaries?.[0]?.['employment-summary']?.organization?.name) {
      employment = data['activities-summary'].employments['affiliation-group'][0].summaries[0]['employment-summary'].organization.name;
    }

    let keywords = [];
    if (data.person?.keywords?.keyword) {
      keywords = data.person.keywords.keyword
        .map(kw => kw.content)
        .filter(kw => kw.toLowerCase() !== 'archaeology');
    }

    let location = "Location not available";
    if (data.person?.addresses?.address?.[0]?.country?.value) {
      const countryCode = data.person.addresses.address[0].country.value;
      location = getCountryName(countryCode) || countryCode;
    }

    if (name !== "Name not available") {
      return { orcid: orcidId, name, location, employment, keywords, orcidUrl };
    }
    return null;
  } catch (error) {
    console.error('Error extracting researcher data:', error);
    return null;
  }
}

/**
 * Helper function to convert country code to full name.
 */
function getCountryName(countryCode) {
    if (!countryCode) return null;
    const countryMap = {'GB':'United Kingdom','US':'United States','CA':'Canada','AU':'Australia','DE':'Germany','FR':'France','ES':'Spain','IT':'Italy','CN':'China','JP':'Japan','IN':'India','BR':'Brazil','MX':'Mexico','RU':'Russia','ZA':'South Africa','EG':'Egypt','MA':'Morocco','TR':'Turkey','GR':'Greece','PT':'Portugal','NL':'Netherlands','SE':'Sweden','NO':'Norway','DK':'Denmark','FI':'Finland','PL':'Poland','CZ':'Czech Republic','HU':'Hungary','AT':'Austria','CH':'Switzerland','BE':'Belgium','IE':'Ireland','NZ':'New Zealand','AR':'Argentina','CL':'Chile','PE':'Peru','CO':'Colombia','VE':'Venezuela','UY':'Uruguay','PY':'Paraguay','BO':'Bolivia','EC':'Ecuador','CR':'Costa Rica','GT':'Guatemala','HN':'Honduras','SV':'El Salvador','NI':'Nicaragua','PA':'Panama','CU':'Cuba','DO':'Dominican Republic','HT':'Haiti','JM':'Jamaica','TT':'Trinidad and Tobago','BB':'Barbados','BS':'Bahamas','BZ':'Belize','SR':'Suriname','GY':'Guyana','FK':'Falkland Islands','GF':'French Guiana','GP':'Guadeloupe','MQ':'Martinique','AW':'Aruba','CW':'Curaçao','SX':'Sint Maarten','BQ':'Caribbean Netherlands','KY':'Cayman Islands','TC':'Turks and Caicos Islands','VG':'British Virgin Islands','VI':'U.S. Virgin Islands','PR':'Puerto Rico','AG':'Antigua and Barbuda','KN':'Saint Kitts and Nevis','LC':'Saint Lucia','VC':'Saint Vincent and the Grenadines','GD':'Grenada','DM':'Dominica','MS':'Montserrat','AI':'Anguilla','MF':'Saint Martin','BL':'Saint Barthélemy','PM':'Saint Pierre and Miquelon','GL':'Greenland','FO':'Faroe Islands','GI':'Gibraltar','AD':'Andorra','LI':'Liechtenstein','SM':'San Marino','VA':'Vatican City','MC':'Monaco','LU':'Luxembourg','IS':'Iceland','MT':'Malta','CY':'Cyprus','AL':'Albania','MK':'North Macedonia','RS':'Serbia','ME':'Montenegro','BA':'Bosnia and Herzegovina','HR':'Croatia','SI':'Slovenia','SK':'Slovakia','EE':'Estonia','LV':'Latvia','LT':'Lithuania','BY':'Belarus','UA':'Ukraine','MD':'Moldova','AM':'Armenia','GE':'Georgia','AZ':'Azerbaijan','KZ':'Kazakhstan','KG':'Kyrgyzstan','UZ':'Uzbekistan','TM':'Turkmenistan','TJ':'Tajikistan','MN':'Mongolia','KR':'South Korea','KP':'North Korea','VN':'Vietnam','TH':'Thailand','SG':'Singapore','MY':'Malaysia','ID':'Indonesia','PH':'Philippines','BN':'Brunei','TL':'Timor-Leste','KH':'Cambodia','LA':'Laos','MM':'Myanmar','BD':'Bangladesh','LK':'Sri Lanka','MV':'Maldives','BT':'Bhutan','NP':'Nepal','PK':'Pakistan','AF':'Afghanistan','IR':'Iran','IQ':'Iraq','SY':'Syria','JO':'Jordan','LB':'Lebanon','IL':'Israel','PS':'Palestine','AE':'United Arab Emirates','SA':'Saudi Arabia','YE':'Yemen','OM':'Oman','QA':'Qatar','KW':'Kuwait','BH':'Bahrain','TN':'Tunisia','DZ':'Algeria','LY':'Libya','SD':'Sudan','SS':'South Sudan','EH':'Western Sahara','MR':'Mauritania','ML':'Mali','NE':'Niger','TD':'Chad','BF':'Burkina Faso','BJ':'Benin','TG':'Togo','CI':'Côte d\'Ivoire','GH':'Ghana','SN':'Senegal','GM':'Gambia','GN':'Guinea','GW':'Guinea-Bissau','SL':'Sierra Leone','LR':'Liberia','NG':'Nigeria','CM':'Cameroon','CF':'Central African Republic','GA':'Gabon','CG':'Republic of the Congo','CD':'Democratic Republic of the Congo','AO':'Angola','ZM':'Zambia','MW':'Malawi','MZ':'Mozambique','ZW':'Zimbabwe','BW':'Botswana','NA':'Namibia','SZ':'Eswatini','LS':'Lesotho','MG':'Madagascar','MU':'Mauritius','SC':'Seychelles','KM':'Comoros','CV':'Cape Verde','ST':'São Tomé and Príncipe','BI':'Burundi','RW':'Rwanda','UG':'Uganda','TZ':'Tanzania','KE':'Kenya','ET':'Ethiopia','ER':'Eritrea','DJ':'Djibouti','SO':'Somalia'};
    return countryMap[countryCode] || countryCode;
}
