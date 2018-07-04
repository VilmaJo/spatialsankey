define([
    'd3', 'd3-scale', 'd3-interpolate'
], function(d3, d3scale) {
    function transformData(actors, locations, materials, actor2actor) {
        var locationsData = {};
        var levelData = {};
        locations.features.forEach(function (location) {
            var actorId = location.properties.actor,
                coordinates = location.geometry.coordinates,
                level = location.properties.level;
            locationsData[actorId] = coordinates;
            levelData[actorId] = level;
        });

        var styles = {};

        var uniqueActivity = new Set();                           //to get array of unique values
        var uniqueLevel = new Set();
        var actorsData = {},
            topLeft = [10000, 0],
            bottomRight = [0, 10000];
        actors.forEach(function (actor) {
            var coordinates = locationsData[actor.id] || [Math.random() * 13 + 4, Math.random() * 18 + 40];         // !!!!!!!!!! random coordinates
            var lon = coordinates[0],
                lat = coordinates[1];
            topLeft = [Math.min(topLeft[0], lon), Math.max(topLeft[1], lat)];
            bottomRight = [Math.max(bottomRight[0], lon), Math.min(bottomRight[1], lat)];
            var level = levelData[actor.id],
                label = 'Name: ' + actor.name + '<br>Level: ' + level + '<br>Activity: ' + actor.activity;
            actorsData[actor.id] = {
                'name': actor.name,
                'label': label,
                'lon': lon,
                'lat': lat,
                'style': 'group' + actor.activity,
                'level': 'level' + level
            };

            uniqueActivity = uniqueActivity.add(actor.activity)
            uniqueLevel = uniqueLevel.add(level)
        });

        // sort the unique levels to assign proper radius
        var levelArray = Array.from(uniqueLevel);
        levelArray.sort(function(a, b){return b - a});
        console.log(levelArray);

        // define color range and assign color to nodes activity
        var nodeColor = d3.scale.linear()
            .range(["#a6cee3",
                    "#1f78b4",
                    "#b2df8a"])
        /*.range (["#1b9e77",
        "#d95f02",
        "#7570b3"])*/
        .domain([0, 1, uniqueActivity.size-1])
        .interpolate(d3.interpolateHsl);
    var i = 0;

    uniqueActivity.forEach(function (groupId) {
        var color = nodeColor(i);
        styles['group' + groupId] = {'color': color};
        i += 1;
    });


    // define radius range and assign radius to nodes level
    var nodeRadius = d3.scale.linear()
        .range([10,25])
        .domain([0,uniqueLevel.size-1])
        .interpolate(d3.interpolateNumber);
    var i = 0;

    levelArray.forEach(function (level) {
        var radius = nodeRadius(i);
        styles['level' + level] = {'radius': radius};
        i += 1;
    });




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
                complabel = (flow.waste) ? 'Waste' : 'Product',
                origin = actorsData[flow.origin],
                originName = (origin) ? origin.name : '',
                destination = actorsData[flow.destination],
                destinationName = (destination) ? destination.name : '',
                flowlabel = originName + '&#10132; '  + destinationName,
                label = flowlabel + '<br>' + complabel + ': ' + flow.composition.name + '<br>Material: ' + material.name + '<br>Amount:' + amount + ' t/year',
                labelTotal = flowlabel + '<br>' + complabel + ': ' + flow.composition.name + '<br>Material: ' + material.name + '<br>Amount:' + totalAmount + ' t/year';
            flowsData[i] = {
                'id': flow.id,
                'source': flow.origin,
                'target': flow.destination,
                'value': amount,
                'valueTotal':totalAmount,
                'label': label,
                'labelTotal': labelTotal,
                'style': 'material' + fraction.material
            };
            uniqueMaterials.add(fraction.material);
            i += 1;
        });
    });
    // defining colors for each individual material by using the d3 color scale rainbow
    /*      http://d3indepth.com/scales/
    var sequentialScale = d3.scaleSequential()
        .domain([0, 100])
        .interpolator(d3.interpolateRainbow);

    sequentialScale(0);   // returns 'rgb(110, 64, 170)'
    sequentialScale(50);  // returns 'rgb(175, 240, 91)'
    sequentialScale(100); // returns 'rgb(110, 64, 170)'
    */

        //define color range and assign colors to unique materials
        var materialColor = d3.scale.linear()
            .range(["#1b9e77",
                    "#d95f02",
                    "#7570b3"])
            .domain([0, 1, uniqueMaterials.size-1])
            .interpolate(d3.interpolateHsl);
        var i = 0;

        uniqueMaterials.forEach(function (materialId) {
            var color = materialColor(i);
                styles['material' + materialId] = {'color':color};
            i += 1;
        });


        return {flows: flowsData, nodes: actorsData, styles: styles, bbox: [topLeft, bottomRight]};
    }
    return transformData;
})
