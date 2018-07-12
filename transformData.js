define([
    'd3', 'd3-scale', 'd3-interpolate'
], function(d3, d3scale) {
    function transformData(actors, locations, locations2, materials, actor2actor, levels) {

        var styles = {};

        var levelsData ={};
        levels.forEach(function(level) {
            var name = level.name;
            levelsData[level.level] = name;
        });

        actorsName = {};
        actorsActivity = {};
        actors.forEach(function(actor) {
           var name = actor.name,
               activity = actor.activitygroup_name;
            actorsName[actor.id] = name
            actorsActivity[actor.id] = activity
        });

        var locationsData = {};
        locations.forEach(function (location) {
            var actorId = location.id,
                coordinates = location.point_on_surface.coordinates;
            var lon = coordinates[0],
                lat = coordinates[1];
            var level = location.level,
                levelName = levelsData[location.level];
            var label = '<b>Name: </b>' + location.name +'<br><b>Administrative Level: </b>' + levelName;
            locationsData[location.id]= {
                'name': location.name,
                'lon': lon,
                'lat': lat,
                'level': level,
                'style': 'level' + level,
                'label': label
            }
        });

        var locations2Data = {};
        locations2.features.forEach(function (location2) {
           //console.log(location2)
            var actorId = location2.properties.actor,
                geometry = location2.geometry;
            var coordinates = location2.geometry.coordinates;
            var lon = coordinates[0],
                lat = coordinates[1];
            var level = location2.properties.level,
                levelName = 'Actor',
                name = actorsName[location2.properties.actor],
                activity = actorsActivity[location2.properties.actor];
            var label = '<b>Name: </b>' + name +'<br><b>Administrative Level: </b>' + levelName + '<b><br>Activity: </b>' + activity;
            locationsData[actorId]= {
                'name': name,
                'lon': lon,
                'lat': lat,
                'level': level,
                'style': 'level' + level,
                'label': label
            }
        });

        //console.log(Object.keys(locationsData).length)

        // define boundingbox
        var topLeft = [10000, 0],
            bottomRight = [0, 10000];
        Object.values(locationsData).forEach(function (location){
            var lon = location.lon,
                lat = location.lat;
            topLeft = [Math.min(topLeft[0], lon), Math.max(topLeft[1], lat)];
            bottomRight = [Math.max(bottomRight[0], lon), Math.min(bottomRight[1], lat)];
        });


        /*
                var uniqueActivity = new Set();                           //to get array of unique values
                var actorsData = {},
                    topLeft = [10000, 0],
                    bottomRight = [0, 10000];
                actors.forEach(function (actor) {
                    var actorId = actor.id;
                    var coordinates = locationsData[actorId] || [Math.random() * 13 + 4, Math.random() * 18 + 40];         // !!!!!!!!!! random coordinates
                    var level = levelData[actor.id];
                    console.log(actorId)
                    console.log(level)
                    var lon = coordinates[0],
                        lat = coordinates[1];
                    topLeft = [Math.min(topLeft[0], lon), Math.max(topLeft[1], lat)];
                    bottomRight = [Math.max(bottomRight[0], lon), Math.min(bottomRight[1], lat)];
                    var label = 'Name: ' + actor.name + '<br>Level: ' + level + '<br>Activity: ' + actor.activity;
                    console.log(label)
                    actorsData[actor.id] = {
                        'name': actor.name,
                        'label': label,
                        'lon': lon,
                        'lat': lat,
                        'style': 'group' + actor.activity,
                        'level': level
                    };

                    uniqueActivity = uniqueActivity.add(actor.activity)
                });
        console.log(actorsData)
        */
        /*
                // define color range and assign color to nodes activity
                var nodeColor = d3.scale.linear()
                    /*.range(["#a6cee3",
                            "#1f78b4",
                            "#b2df8a"])*/
        /*           .range(["#1f78b4",
                       "#b2df8a",
                       "#33a02c"])
               /*.range (["#1b9e77",
               "#d95f02",
               "#7570b3"])*/
        /*        .domain([0, 1, uniqueActivity.size-1])
                .interpolate(d3.interpolateHsl);
            var i = 0;

            uniqueActivity.forEach(function (groupId) {
                var color = nodeColor(i);
                styles['group' + groupId] = {'color': color};
                i += 1;
            });

        */

        function defineRadius(level){
            var level = level;
            if (level === 10) {return 11}
            if (level === 8) {return 16}
            if (level === 6) {return 21}
            if (level === 4) {return 26}
            else {return 6}
        };


        for (var key in locationsData){
            var level = locationsData[key].level;
            var radius = defineRadius(level);
            styles[level] = {'radius': radius};
        };


        var materialsData = {};
        materials.forEach(function (material) {
            materialsData[material.id] = {'name': material.name, 'level': material.level}
        });


        var uniqueMaterials = new Set();
        var flowsData = {};
        i = 0;
        actor2actor.forEach(function (flow) {
            flow.composition.fractions.forEach(function (fraction) {
                var amount = flow.amount * fraction.fraction,
                    totalAmount = flow.amount,
                    material = materialsData[fraction.material],
                    complabel = (flow.waste) ? '<b>Waste</b>b>' : '<b>Product</b>',
                    origin = locationsData[flow.origin],
                    originName = (origin) ? origin.name : '',
                    destination = locationsData[flow.destination],
                    destinationName = (destination) ? destination.name : '',
                    flowlabel = originName + '&#10132; '  + destinationName,
                    label = flowlabel + '<br>' +complabel + ': ' + flow.composition.name + '<b><br>Material: </b>' + material.name + '<b><br>Amount: </b>' + amount + ' t/year',
                    labelTotal = flowlabel + '<br>' + complabel + ': ' + flow.composition.name + '<b><br>Amount: </b>' + totalAmount + ' t/year';
                flowsData[i] = {
                    'id': flow.id,
                    'source': flow.origin,
                    'target': flow.destination,
                    'value': amount,
                    'valueTotal':totalAmount,
                    'label': label,
                    'labelTotal': labelTotal,
                    'style': fraction.material
                };
                uniqueMaterials.add(fraction.material);
                i += 1;
            });
        });


        //console.log(Object.keys(flowsData).length)

        //define color range and assign colors to unique materials
        var materialColor = d3.scale.linear()
            // colorbrewer
            //.range(["#1b9e77", "#d95f02", "#7570b3"])
            // Pauls Tol's Notes https://personal.sron.nl/~pault/#sec:qualitative       BRIGHT
            .range(["#4477AA",
                "#228833",
                "#AA3377"])
            // Pauls Tol's Notes https://personal.sron.nl/~pault/#sec:qualitative       Vibrant
            //.range(["#0077BB", "#009988", "#EE3377"])
            .domain([0, 1, uniqueMaterials.size-1])
            .interpolate(d3.interpolateHsl);
        var i = 0;

        uniqueMaterials.forEach(function (materialId) {
            var color = materialColor(i);
            styles[materialId] = {'color':color};
            i += 1;
        });


        return {flows: flowsData, nodes: locationsData, styles: styles, bbox: [topLeft, bottomRight]};
    }
    return transformData;
})
