let restaurant;
var newMap;

/**
* Initialize map as soon as the page is loaded.
*/
document.addEventListener('DOMContentLoaded', event => {
    initMap();
    if (!navigator.onLine) showOfflineState();
});

/**
* Initialize leaflet map
*/
initMap = () => {
    fetchRestaurantFromURL((error, restaurant) => {
        if (error) { // Got an error!
            console.error(error);
        } else {
            self.newMap = L.map('map', {
                center: [restaurant.latlng.lat, restaurant.latlng.lng],
                zoom: 16,
                scrollWheelZoom: false
            });
            L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
                mapboxToken: 'pk.eyJ1IjoibWdsZXpzb3NhIiwiYSI6ImNqamFpOWk3NDFsaHMza21tbjV6bzNlaDUifQ.tcT2Kq43-IYu8KNRkWRbyQ',
                maxZoom: 18,
                attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
                '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
                'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
                id: 'mapbox.streets'
            }).addTo(newMap);
            fillBreadcrumb();
            DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
        }
    });
}

/**
* Get current restaurant from page URL.
*/
fetchRestaurantFromURL = callback => {
    if (self.restaurant) { // restaurant already fetched!
        callback(null, self.restaurant)
        return;
    }
    const id = getParameterByName('id');
    if (!id) { // no id found in URL
        error = 'No restaurant id in URL'
        callback(error, null);
    } else {
        DBHelper.fetchRestaurantById(id, (error, restaurant) => {
            self.restaurant = restaurant;
            if (!restaurant) {
                console.error(error);
                return;
            }
            fillRestaurantHTML();
            callback(null, restaurant)
        });
    }
}

/**
* Create restaurant HTML and add it to the webpage
*/
fillRestaurantHTML = (restaurant = self.restaurant) => {
    const name = document.getElementById('restaurant-name');
    name.innerHTML = restaurant.name;

    const address = document.getElementById('restaurant-address');
    address.innerHTML = restaurant.address;

    const picture = document.getElementById('restaurant-img-picture');
    const source = document.createElement('source');
    source.setAttribute("media", "(min-width: 500px)");
    source.setAttribute("srcset", "/images/" + restaurant.id + "-800.jpg");
    const image = document.createElement('img');
    image.alt = restaurant.name;
    image.className = 'restaurant-img';
    image.style.cssText = 'object-fit: cover;';
    image.src = "/images/" + restaurant.id + "-400.jpg";
    picture.append(source);
    picture.append(image);

    const cuisine = document.getElementById('restaurant-cuisine');
    cuisine.innerHTML = restaurant.cuisine_type;

    // fill operating hours
    if (restaurant.operating_hours) {
        fillRestaurantHoursHTML();
    }

    DBHelper.fetchRestaurantReviews(restaurant.id, (reviews) => {
        if (!reviews) return;
        fillReviewsHTML(reviews);
    });

    const favForm = document.getElementById('fav--form');
    const toggleFav = document.getElementById('toggle--fav');
    toggleFav.checked = restaurant.is_favorite;
    favForm.action = `http://localhost:1337/restaurants/${restaurant.id}/`;
    document.getElementById("restaurant_id").value = restaurant.id;
}

/**
* Create restaurant operating hours HTML table and add it to the webpage.
*/
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
    const hours = document.getElementById('restaurant-hours');
    for (let key in operatingHours) {
        const row = document.createElement('tr');

        const day = document.createElement('td');
        day.innerHTML = key;
        row.appendChild(day);

        const time = document.createElement('td');
        time.innerHTML = operatingHours[key];
        row.appendChild(time);

        hours.appendChild(row);
    }
}

/**
* Create all reviews HTML and add them to the webpage.
*/
fillReviewsHTML = reviews => {
    const container = document.getElementById('reviews-container');

    if (!reviews) {
        const noReviews = document.createElement('p');
        noReviews.innerHTML = 'No reviews yet!';
        container.appendChild(noReviews);
        return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
        ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
}

/**
* Create review HTML and add it to the webpage.
*/
createReviewHTML = review => {
    const li = document.createElement('li');
    const name = document.createElement('p');
    name.innerHTML = review.name;
    li.appendChild(name);

    const date = document.createElement('p');
    date.innerHTML = timeConverter(review.updatedAt);
    li.appendChild(date);

    const rating = document.createElement('p');
    rating.innerHTML = `Rating: ${review.rating}`;
    li.appendChild(rating);

    const comments = document.createElement('p');
    comments.innerHTML = review.comments;
    li.appendChild(comments);

    return li;
}

/**
* Add restaurant name to the breadcrumb navigation menu
*/
fillBreadcrumb = (restaurant=self.restaurant) => {
    const breadcrumb = document.getElementById('breadcrumb');
    const li = document.createElement('li');
    li.innerHTML = restaurant.name;
    breadcrumb.appendChild(li);
}

/**
* Get a parameter by name from page URL.
*/
getParameterByName = (name, url) => {
    if (!url)
    url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
    if (!results)
    return null;
    if (!results[2])
    return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

/**
* Unix timestamp to date format
*/
const timeConverter = UNIX_timestamp => {
    var a = new Date(UNIX_timestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}

/**
 * Convert a FormData object to a javascript object.
 * @param  {[FormData]} formData FormData object to be converted.
 * @return {[Object]}
 */
const formDataToJSON = formData => {
    var convertedJSON= {};
    for (const [key, value]  of formData.entries()) {
        convertedJSON[key] = value;
    }
    return convertedJSON;
};

/**
 * Send a request when checkbox is toggled.
 * @param  {[Event]} evt
 */
document.getElementById('fav--form').onchange = function (evt) {
    const data = formDataToJSON(new FormData(this));
    data.is_favourite = data.is_favourite == undefined ? false : true;
    DBHelper.setFav(self.restaurant.id, data.is_favourite);
    fetch(this.action + '?is_favorite=' + data.is_favourite, {
        method: 'PUT'
    });
};

/**
 * Send the new review via AJAX.
 * @param  {[Event]} evt
 */
document.getElementById('review--form').onsubmit = function (evt) {
    evt.preventDefault();
    const data = formDataToJSON(new FormData(this));
    data.restaurant_id = Number(data.restaurant_id);
    data.updatedAt = data.updatedAt || new Date();
    fetch(this.action, {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
        method: 'POST'
    }).then(response => {
        // If it's a response from the sw
        if (response.status === 202) {
            return data;
        }
        return response.json();
    }).then(review => {
        const list = document.getElementById('reviews-list');
        list.insertBefore(createReviewHTML(review), list.firstChild);
    });
};
