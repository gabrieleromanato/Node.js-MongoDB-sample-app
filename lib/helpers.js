'use strict';

const config = require('./config');

module.exports = {
    date: d => {
        let dt = Date.parse(d);
        let output = '';
        if(!isNaN(dt)) {
            let ds = new Date(dt);
            output = ds.toLocaleDateString();
        }
        return output;
    },
    totalscore: scores => {
        let total = 0;
        scores.forEach(s => {
            total += s.score;
        });
        return total;
    },
    googlemap: coords => {
        return '<div id="map" data-coords="' + coords[0] + ',' + coords[1] + '"></div>';
    },
    relatedmap: related => {
        let data = [];
        related.forEach(rel => {
           let datum = {
               name: rel.name.replace(/[^a-z0-9\s]/g, ''),
               coords: rel.address.coord,
               link: '/restaurants/' + rel.restaurant_id,
               image: '/public/images/' + rel.image
           };
           data.push(datum);
        });
        return "<div id='related-map' data-restaurants='" + JSON.stringify(data) + "'></div>";
    },
    the_image: restaurant => {
        return config.imagesPath + restaurant.image;
    }
};