/* eslint-disable */
export const displayMap = (locations) => {
  const map = L.map('map').setView([34.111745, -118.113491], 10); // Set the initial map center and zoom level

  L.tileLayer(
    'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}',
    {
      maxZoom: 18,
      attribution:
        'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
        'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
      id: 'mapbox.streets',
      accessToken:
        'pk.eyJ1Ijoiam9uYXNzY2htZWR0bWFubiIsImEiOiJjam54ZmM5N3gwNjAzM3dtZDNxYTVlMnd2In0.ytpI7V7w7cyT1Kq5rT9Z1A',
    },
  ).addTo(map);

  const bounds = L.latLngBounds();

  locations.forEach((loc) => {
    // Create marker
    const marker = L.marker(loc.coordinates).addTo(map);

    // Add popup
    marker
      .bindPopup(`<p>Day ${loc.day}: ${loc.description}</p>`, {
        offset: [0, -30], // Offset to adjust the popup's position
      })
      .openPopup();

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  // Fit the map to the bounds of all locations
  map.fitBounds(bounds, {
    paddingTopLeft: [100, 200],
    paddingBottomRight: [100, 150],
  });
};
