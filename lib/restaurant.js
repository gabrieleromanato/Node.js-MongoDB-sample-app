'use strict';

class Restaurant {
    static getRelated(collection, restaurant, relation) {
        let query = {};
        query = relation;
        query._id = { $not: { $eq: restaurant._id }};
        return collection.find(query).limit(6);
    }

    static getTop(collection) {
        let query = [
            { $unwind : '$grades' },
            { $group : {
                _id : { restaurant_id: "$restaurant_id", name: "$name" },
                'scores' : { $sum : '$grades.score' }
            } },
            { $sort : { 'scores': -1 } },
            { $limit : 10 }
        ];
        return collection.aggregate(query);
    }
}

module.exports = Restaurant;