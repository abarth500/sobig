db.twitter.aggregate(
    [
        { $group: { _id: "$id", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]
);