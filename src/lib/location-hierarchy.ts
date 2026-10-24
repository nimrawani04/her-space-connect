export type StateInfo = {
  name: string;
  lat: number;
  lng: number;
  zoom: number;
  samplePlaces?: Array<{
    name: string;
    startName: string;
    endName: string;
    startCoord: [number, number];
    endCoord: [number, number];
  }>;
};

export type CountryInfo = {
  name: string;
  code: string;
  flag: string;
  lat: number;
  lng: number;
  zoom: number;
  states: StateInfo[];
};

export const GLOBAL_HIERARCHY_COUNTRIES: CountryInfo[] = [
  {
    name: "India",
    code: "IN",
    flag: "🇮🇳",
    lat: 20.5937,
    lng: 78.9629,
    zoom: 5,
    states: [
      {
        name: "Delhi / NCR",
        lat: 28.6139,
        lng: 77.209,
        zoom: 11,
        samplePlaces: [
          {
            name: "University North Campus ➔ Safe Girls Hostel",
            startName: "North Campus Vishwavidyalaya Metro",
            endName: "University Women's Hostel Sanctuary",
            startCoord: [28.694, 77.208],
            endCoord: [28.701, 77.215],
          },
          {
            name: "Connaught Place ➔ Central Metro Station",
            startName: "Inner Circle Safe Corridor",
            endName: "Rajiv Chowk Metro Gate 7",
            startCoord: [28.6328, 77.2197],
            endCoord: [28.634, 77.2185],
          },
          {
            name: "Hauz Khas Village ➔ Green Park Metro",
            startName: "Hauz Khas Main Gate",
            endName: "Green Park Lit Corridor",
            startCoord: [28.553, 77.194],
            endCoord: [28.558, 77.206],
          },
        ],
      },
      {
        name: "Maharashtra (Mumbai / Pune)",
        lat: 19.076,
        lng: 72.8777,
        zoom: 9,
        samplePlaces: [
          {
            name: "Marine Drive Promenade ➔ Churchgate Station",
            startName: "Marine Drive Walkway (24/7 Police Post)",
            endName: "Churchgate Safe Transit Hub",
            startCoord: [18.9322, 72.823],
            endCoord: [18.935, 72.8272],
          },
          {
            name: "Bandra Bandstand ➔ Hill Road Sanctuary",
            startName: "Bandstand Ocean Walk",
            endName: "Hill Road Lit Shopping Belt",
            startCoord: [19.0475, 72.818],
            endCoord: [19.056, 72.833],
          },
        ],
      },
      {
        name: "Karnataka (Bengaluru)",
        lat: 12.9716,
        lng: 77.5946,
        zoom: 10,
        samplePlaces: [
          {
            name: "Indiranagar 100ft Rd ➔ Metro Station",
            startName: "Indiranagar 12th Main Safe Haven",
            endName: "Indiranagar Metro Station",
            startCoord: [12.9719, 77.6412],
            endCoord: [12.9784, 77.6387],
          },
          {
            name: "Koramangala 4th Block ➔ Forum Haven",
            startName: "Koramangala 80ft Road",
            endName: "Forum Central Safe Zone",
            startCoord: [12.934, 77.625],
            endCoord: [12.935, 77.613],
          },
        ],
      },
      {
        name: "Tamil Nadu (Chennai)",
        lat: 13.0827,
        lng: 80.2707,
        zoom: 10,
        samplePlaces: [
          {
            name: "Marina Beach Promenade ➔ Light House Haven",
            startName: "Marina Beach Promenade Walkway",
            endName: "Light House Safe Transit Point",
            startCoord: [13.05, 80.282],
            endCoord: [13.039, 80.279],
          },
        ],
      },
      {
        name: "West Bengal (Kolkata)",
        lat: 22.5726,
        lng: 88.3639,
        zoom: 10,
        samplePlaces: [
          {
            name: "Park Street ➔ Victoria Memorial Sanctuary",
            startName: "Park Street Active Food & Police Zone",
            endName: "Victoria Memorial Safe Gate",
            startCoord: [22.551, 88.352],
            endCoord: [22.544, 88.342],
          },
        ],
      },
      {
        name: "Telangana (Hyderabad)",
        lat: 17.385,
        lng: 78.4867,
        zoom: 10,
        samplePlaces: [
          {
            name: "Hitec City Cyber Towers ➔ Mindspace Haven",
            startName: "Cyber Towers Safe Walk",
            endName: "Mindspace Female Escort Station",
            startCoord: [17.4504, 78.3808],
            endCoord: [17.441, 78.381],
          },
        ],
      },
    ],
  },
  {
    name: "United States",
    code: "US",
    flag: "🇺🇸",
    lat: 39.8283,
    lng: -98.5795,
    zoom: 4,
    states: [
      {
        name: "New York",
        lat: 40.7128,
        lng: -74.006,
        zoom: 11,
        samplePlaces: [
          {
            name: "Bryant Park Sanctuary ➔ Grand Central Terminal",
            startName: "Bryant Park Well-Lit Promenade",
            endName: "Grand Central Station Main Concourse",
            startCoord: [40.7536, -73.9832],
            endCoord: [40.7527, -73.9772],
          },
          {
            name: "Central Park South ➔ Columbus Circle",
            startName: "Central Park South Walkway",
            endName: "Columbus Circle Transit Hub",
            startCoord: [40.766, -73.977],
            endCoord: [40.768, -73.982],
          },
        ],
      },
      {
        name: "California",
        lat: 36.7783,
        lng: -119.4179,
        zoom: 6,
        samplePlaces: [
          {
            name: "San Francisco Union Square ➔ Ferry Building",
            startName: "Union Square Monitored Plaza",
            endName: "Ferry Building Safe Belt",
            startCoord: [37.7879, -122.4074],
            endCoord: [37.7955, -122.3937],
          },
          {
            name: "Santa Monica Pier ➔ 3rd St Promenade",
            startName: "Santa Monica Pier Boardwalk",
            endName: "3rd Street Promenade Safe District",
            startCoord: [34.01, -118.496],
            endCoord: [34.016, -118.498],
          },
        ],
      },
      {
        name: "Washington",
        lat: 47.6062,
        lng: -122.3321,
        zoom: 10,
        samplePlaces: [
          {
            name: "Pike Place Market ➔ Westlake Transit Center",
            startName: "Pike Place Market Active Zone",
            endName: "Westlake Center Light Rail",
            startCoord: [47.6097, -122.3422],
            endCoord: [47.6114, -122.337],
          },
        ],
      },
      {
        name: "Illinois",
        lat: 41.8781,
        lng: -87.6298,
        zoom: 10,
        samplePlaces: [
          {
            name: "Millennium Park ➔ Chicago Loop Haven",
            startName: "Millennium Park Cloud Gate",
            endName: "The Loop Monitored Subway Hub",
            startCoord: [41.8826, -87.6226],
            endCoord: [41.881, -87.629],
          },
        ],
      },
    ],
  },
  {
    name: "United Kingdom",
    code: "GB",
    flag: "🇬🇧",
    lat: 55.3781,
    lng: -3.436,
    zoom: 6,
    states: [
      {
        name: "Greater London",
        lat: 51.5074,
        lng: -0.1278,
        zoom: 11,
        samplePlaces: [
          {
            name: "Covent Garden Plaza ➔ King's Cross Safe Corridor",
            startName: "Covent Garden Lit Piazza",
            endName: "King's Cross St Pancras Sanctuary",
            startCoord: [51.5117, -0.124],
            endCoord: [51.5308, -0.1238],
          },
          {
            name: "Westminster Bridge ➔ Southbank Safe Walk",
            startName: "Westminster Underground Station",
            endName: "Southbank Centre Protected Walkway",
            startCoord: [51.501, -0.125],
            endCoord: [51.506, -0.116],
          },
        ],
      },
      {
        name: "Manchester",
        lat: 53.4808,
        lng: -2.2426,
        zoom: 11,
        samplePlaces: [
          {
            name: "Piccadilly Gardens ➔ Manchester Central Library",
            startName: "Piccadilly Gardens Transport Interchange",
            endName: "Central Library Sanctuary Hub",
            startCoord: [53.4808, -2.237],
            endCoord: [53.478, -2.244],
          },
        ],
      },
      {
        name: "Scotland (Edinburgh)",
        lat: 55.9533,
        lng: -3.1883,
        zoom: 11,
        samplePlaces: [
          {
            name: "Princes Street Gardens ➔ Waverley Station",
            startName: "Princes Street Illuminated Belt",
            endName: "Edinburgh Waverley Safe Post",
            startCoord: [55.9515, -3.2005],
            endCoord: [55.952, -3.189],
          },
        ],
      },
    ],
  },
  {
    name: "Japan",
    code: "JP",
    flag: "🇯🇵",
    lat: 36.2048,
    lng: 138.2529,
    zoom: 5,
    states: [
      {
        name: "Tokyo",
        lat: 35.6762,
        lng: 139.6503,
        zoom: 12,
        samplePlaces: [
          {
            name: "Shibuya Station (Koban Exit) ➔ Yoyogi Park Sanctuary",
            startName: "Shibuya Station Hachiko Koban",
            endName: "Yoyogi Safe Park Corridor",
            startCoord: [35.658, 139.7016],
            endCoord: [35.664, 139.698],
          },
          {
            name: "Shinjuku South Exit ➔ Shinjuku Gyoen",
            startName: "Shinjuku Station South Promenade",
            endName: "Gyoen Sanctuary Entrance",
            startCoord: [35.689, 139.7005],
            endCoord: [35.686, 139.708],
          },
        ],
      },
      {
        name: "Osaka",
        lat: 34.6937,
        lng: 135.5023,
        zoom: 11,
        samplePlaces: [
          {
            name: "Umeda Station Safe Artery ➔ Nakanoshima Park",
            startName: "Osaka Umeda Station Terminal",
            endName: "Nakanoshima Waterfront Sanctuary",
            startCoord: [34.7024, 135.4959],
            endCoord: [34.693, 135.503],
          },
        ],
      },
    ],
  },
  {
    name: "Canada",
    code: "CA",
    flag: "🇨🇦",
    lat: 56.1304,
    lng: -106.3468,
    zoom: 4,
    states: [
      {
        name: "Ontario (Toronto)",
        lat: 43.6532,
        lng: -79.3832,
        zoom: 10,
        samplePlaces: [
          {
            name: "Union Station ➔ Queen's Park Safe Belt",
            startName: "Toronto Union Station",
            endName: "Queen's Park Lit Sanctuary",
            startCoord: [43.6453, -79.3806],
            endCoord: [43.6629, -79.3957],
          },
        ],
      },
      {
        name: "British Columbia (Vancouver)",
        lat: 49.2827,
        lng: -123.1207,
        zoom: 10,
        samplePlaces: [
          {
            name: "Waterfront Station ➔ Robson Square",
            startName: "Waterfront SeaBus Terminal",
            endName: "Robson Square Illuminated Hub",
            startCoord: [49.2859, -123.1117],
            endCoord: [49.2825, -123.1207],
          },
        ],
      },
    ],
  },
  {
    name: "Australia",
    code: "AU",
    flag: "🇦🇺",
    lat: -25.2744,
    lng: 133.7751,
    zoom: 4,
    states: [
      {
        name: "New South Wales (Sydney)",
        lat: -33.8688,
        lng: 151.2093,
        zoom: 11,
        samplePlaces: [
          {
            name: "Circular Quay ➔ Darling Harbour Promenade",
            startName: "Circular Quay Station",
            endName: "Darling Harbour Safe Walk",
            startCoord: [-33.8617, 151.2108],
            endCoord: [-33.8735, 151.2008],
          },
        ],
      },
      {
        name: "Victoria (Melbourne)",
        lat: -37.8136,
        lng: 144.9631,
        zoom: 11,
        samplePlaces: [
          {
            name: "Flinders Street Station ➔ Federation Square",
            startName: "Flinders Street Station Underpass",
            endName: "Federation Square Cultural Haven",
            startCoord: [-37.818, 144.967],
            endCoord: [-37.8175, 144.969],
          },
        ],
      },
    ],
  },
  {
    name: "United Arab Emirates",
    code: "AE",
    flag: "🇦🇪",
    lat: 23.4241,
    lng: 53.8478,
    zoom: 7,
    states: [
      {
        name: "Dubai",
        lat: 25.2048,
        lng: 55.2708,
        zoom: 11,
        samplePlaces: [
          {
            name: "Dubai Mall Metro ➔ Burj Park Sanctuary",
            startName: "Dubai Mall Metro Link Safe Walk",
            endName: "Burj Park Waterfront Haven",
            startCoord: [25.1972, 55.2744],
            endCoord: [25.192, 55.276],
          },
        ],
      },
    ],
  },
  {
    name: "Pakistan",
    code: "PK",
    flag: "🇵🇰",
    lat: 30.3753,
    lng: 69.3451,
    zoom: 5,
    states: [
      {
        name: "Islamabad Capital",
        lat: 33.6844,
        lng: 73.0479,
        zoom: 11,
        samplePlaces: [
          {
            name: "Blue Area Safe Corridor ➔ F-7 Markaz",
            startName: "Blue Area Metro Station",
            endName: "F-7 Jinnah Super Safe Zone",
            startCoord: [33.715, 73.064],
            endCoord: [33.722, 73.056],
          },
        ],
      },
      {
        name: "Punjab (Lahore)",
        lat: 31.5204,
        lng: 74.3587,
        zoom: 10,
        samplePlaces: [
          {
            name: "Gulberg Main Boulevard ➔ Liberty Roundabout",
            startName: "Gulberg III Safe Artery",
            endName: "Liberty Market Safe Belt",
            startCoord: [31.512, 74.35],
            endCoord: [31.514, 74.342],
          },
        ],
      },
    ],
  },
];
