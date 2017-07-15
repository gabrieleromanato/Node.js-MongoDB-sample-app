'use strict';

(function() {

    function serialize(form) {
        var elements = form.querySelectorAll('input, select, textarea');
        var output = {};
        for(var i = 0; i < elements.length; i++) {
            var element = elements[i];
            if(element.hasAttribute('name')) {
                output[element.getAttribute('name')] = element.value;
            }
        }
        return output;
    }

    function after(el, referenceNode) {
        referenceNode.parentNode.insertBefore(el, referenceNode.nextSibling);
    }

    function ajax(options) {
        options = options || {};
        options.method = options.method || 'GET';
        options.url = options.url || location.href;
        options.type = options.type || 'text';
        options.data = options.data || {};
        options.success = options.success || function() {};
        options.error = options.error || function() {};


        var query = [];
        for(var p in options.data) {
           var s = p + '=' + encodeURIComponent(options.data[p]);
           query.push(s);
        }
        var data = (query.length > 1 ) ? query.join('&') : query.join('');

        var xhr = new XMLHttpRequest();
        xhr.open(options.method, options.url);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onload = function() {
            if (xhr.status === 200) {
                var response;
                switch(options.type) {
                    case 'html':
                    case 'text':
                        response = xhr.responseText;
                        break;
                    case 'json':
                        response = JSON.parse(xhr.responseText);
                        break;
                    case 'xml':
                        response = xhr.responseXML;
                        break;
                    default:
                        response = xhr.responseText;
                        break;
                }
                options.success(response);

            } else {
                options.error(xhr.status);
            }
        };
        xhr.send(data);

    }

    function Voting() {
        this.init();
    }

    Voting.prototype = {
        init: function() {
            this.form = document.querySelector('#voting-form');
            if(this.form !== null) {
                this.vote();
            }
        },
        vote: function() {
            var vote = this.form.querySelector('#vote');
            var grade = this.form.querySelector('#grade');
            var restaurantId = this.form.querySelector('#restaurant_id');

            this.form.addEventListener('submit', function(e) {
               e.preventDefault();
               if(/^\d+$/.test(vote.value) && parseInt(vote.value, 10) <= 100 && grade.value.length > 0) {
                   ajax({
                       method: 'POST',
                       url: '/vote/',
                       type: 'json',
                       data: {
                           id: restaurantId.value,
                           vote: vote.value,
                           grade: grade.value
                       },
                       success: function(resp) {
                           var score = document.querySelector('#score');
                           var total = parseInt(score.firstChild.nodeValue, 10);
                           var tableBody = document.querySelector('#grades tbody');
                           var firstTr = tableBody.querySelectorAll('tr')[0];
                           var grade = document.createElement('tr');
                           grade.innerHTML = '<td>' + resp.date + '</td><td>' + resp.grade + '</td><td>' + resp.score + '</td>';
                           tableBody.insertBefore(grade, firstTr);

                           score.innerHTML = total + resp.score;
                       },
                       error: function(status) {
                           console.log(status);
                       }
                   });
               }
            });
        }
    };



    function app() {
        this.init();
    }

    app.prototype = {
        init: function() {
            this.setMap();
            this.vote();
            this.menu();
            this.booking();
            this.setRelatedMaps();
        },
        menu: function() {
            var nav = document.querySelector('#navigation');

            document.querySelector('#open-nav').addEventListener('click', function(e) {
               e.preventDefault();
               nav.className = 'visible';
            });
            document.querySelector('#close-nav').addEventListener('click', function(e) {
                e.preventDefault();
                nav.className = '';
            });
        },
        booking: function() {
            var book = document.querySelector('#book');
            if(book !== null) {
                book.addEventListener('click', function(e) {
                   e.preventDefault();
                   document.querySelector('#booking').className = 'visible';
                });
                document.querySelector('#close-booking').addEventListener('click', function(e) {
                    e.preventDefault();
                    document.querySelector('#booking').className = '';
                });

                flatpickr('#datehour', { enableTime: true, time_24hr: true });

                document.querySelector('#booking-form').addEventListener('submit', function(e) {
                   e.preventDefault();
                   var bf = this;
                   var query = serialize(bf);
                   var msgs = document.querySelectorAll('.msg');
                   for(var i = 0; i < msgs.length; i++) {
                       var msg = msgs[i];
                       msg.parentNode.removeChild(msg);
                   }

                   ajax({
                        method: 'POST',
                        url: '/book/',
                        type: 'json',
                        data: query,
                        success: function(resp) {
                            if(resp.errors) {
                                resp.errors.forEach(function(err) {
                                   var el = document.querySelector('[name=' + err.attr + ']');
                                   var m = document.createElement('div');
                                   m.className = 'msg error';
                                   m.innerHTML = err.msg;
                                   after(m, el);
                                });
                            } else {
                                var m = document.createElement('div');
                                m.className = 'msg success';
                                m.innerHTML = resp.success;
                                bf.appendChild(m);
                            }
                        },
                        error: function(status) {
                            console.log(status);
                        }
                    });
                });
            }
        },
        vote: function() {
            var v = new Voting();
        },
        setMap: function() {
            var map = document.getElementById('map');
            if(map !== null) {
                var coordsAttr = map.dataset.coords;
                var coordsArr = coordsAttr.split(',');
                var restaurant = {lat: Number(coordsArr[1]), lng: Number(coordsArr[0])};
                if(google) {
                    var _map = new google.maps.Map(map, {
                        zoom: 10,
                        center: restaurant
                    });
                    var marker = new google.maps.Marker({
                        position: restaurant,
                        map: _map
                    });
                }
            }
        },
        setRelatedMaps: function() {
            var map = document.getElementById('related-map');
            var mainMap = document.getElementById('map');
            if(map !== null && mainMap !== null) {
                var restaurants = map.dataset.restaurants;
                var data = JSON.parse(restaurants);
                var coordsAttr = mainMap.dataset.coords;
                var coordsArr = coordsAttr.split(',');
                var restaurant = {lat: Number(coordsArr[1]), lng: Number(coordsArr[0])};

                if(google) {
                    var _mainMap = new google.maps.Map(map, {
                        zoom: 10,
                        center: restaurant,
                        styles: [
                            {
                                "featureType": "all",
                                "elementType": "labels.text.fill",
                                "stylers": [
                                    {
                                        "saturation": 36
                                    },
                                    {
                                        "color": "#333333"
                                    },
                                    {
                                        "lightness": 40
                                    }
                                ]
                            },
                            {
                                "featureType": "all",
                                "elementType": "labels.text.stroke",
                                "stylers": [
                                    {
                                        "visibility": "on"
                                    },
                                    {
                                        "color": "#ffffff"
                                    },
                                    {
                                        "lightness": 16
                                    }
                                ]
                            },
                            {
                                "featureType": "all",
                                "elementType": "labels.icon",
                                "stylers": [
                                    {
                                        "visibility": "off"
                                    }
                                ]
                            },
                            {
                                "featureType": "administrative",
                                "elementType": "geometry.fill",
                                "stylers": [
                                    {
                                        "color": "#fefefe"
                                    },
                                    {
                                        "lightness": 20
                                    }
                                ]
                            },
                            {
                                "featureType": "administrative",
                                "elementType": "geometry.stroke",
                                "stylers": [
                                    {
                                        "color": "#fefefe"
                                    },
                                    {
                                        "lightness": 17
                                    },
                                    {
                                        "weight": 1.2
                                    }
                                ]
                            },
                            {
                                "featureType": "landscape",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#f5f5f5"
                                    },
                                    {
                                        "lightness": 20
                                    }
                                ]
                            },
                            {
                                "featureType": "poi",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#f5f5f5"
                                    },
                                    {
                                        "lightness": 21
                                    }
                                ]
                            },
                            {
                                "featureType": "poi.park",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#dedede"
                                    },
                                    {
                                        "lightness": 21
                                    }
                                ]
                            },
                            {
                                "featureType": "road.highway",
                                "elementType": "geometry.fill",
                                "stylers": [
                                    {
                                        "color": "#ffffff"
                                    },
                                    {
                                        "lightness": 17
                                    }
                                ]
                            },
                            {
                                "featureType": "road.highway",
                                "elementType": "geometry.stroke",
                                "stylers": [
                                    {
                                        "color": "#ffffff"
                                    },
                                    {
                                        "lightness": 29
                                    },
                                    {
                                        "weight": 0.2
                                    }
                                ]
                            },
                            {
                                "featureType": "road.arterial",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#ffffff"
                                    },
                                    {
                                        "lightness": 18
                                    }
                                ]
                            },
                            {
                                "featureType": "road.local",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#ffffff"
                                    },
                                    {
                                        "lightness": 16
                                    }
                                ]
                            },
                            {
                                "featureType": "transit",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#f2f2f2"
                                    },
                                    {
                                        "lightness": 19
                                    }
                                ]
                            },
                            {
                                "featureType": "water",
                                "elementType": "geometry",
                                "stylers": [
                                    {
                                        "color": "#e9e9e9"
                                    },
                                    {
                                        "lightness": 17
                                    }
                                ]
                            }
                        ]
                    });

                    var infowindow = new google.maps.InfoWindow();
                    var marker;
                    data.forEach(function(datum, i) {
                        marker = new google.maps.Marker({
                            position: new google.maps.LatLng(Number(datum.coords[1]), Number(datum.coords[0])),
                            map: _mainMap
                        });
                        google.maps.event.addListener(marker, 'click', (function(marker, i) {
                            return function() {
                                infowindow.setContent('<div class="map-wrap"><a class="map-title" href="' + datum.link + '">' + datum.name + '</a><p class="map-img"><img src="' + datum.image + '" class="responsive"></p></div>');
                                infowindow.open(_mainMap, marker);
                            }
                        })(marker, i));
                    });
                }

            }
        }
    }

    document.addEventListener('DOMContentLoaded', function() {
        var _app = new app();
    });
})();