function transformData (actors, locations, materials, actor2actor){

    var locationsData = {};
    locations.features.forEach(function(location){
        var actorId = location.properties.actor,
            coordinates = location.geometry.coordinates;
        locationsData[actorId] = coordinates;
    });

    var styles = {};
    var uniqueGroups = new Set();                           //to get array of unique values
    var actorsData = {};
    actors.forEach(function (actor) {
        var coordinates = locationsData[actor.id] || [Math.random()*15+4, Math.random()*15+50];         //random coordinates
        actorsData[actor.id] = {
            'name': actor.name,
            'label': actor.name,
            'lon': coordinates[0],
            'lat': coordinates[1],
            'style': 'group' + actor.activity,
            'level': 5

        };
        uniqueGroups = uniqueGroups.add(actor.activity)
    });

    var colorStep = 255 / (uniqueGroups.size-1);
    var i = 0;
    uniqueGroups.forEach(function(groupId){
        var color = i * colorStep;
        var rgb = 'rgb(' + color + ',' + color + ',' + color + ')';
        var style = { 'color': rgb };
        styles['group' + groupId] = style;
        i += 1;
    })

    var materialsData = {};
    materials.forEach(function(material){
        materialsData[material.id] = {'name':material.name, 'level':material.level}
    });

    var uniqueMaterials = new Set();
    var flowsData = {};
    i = 0;
    actor2actor.forEach(function(flow){
        flow.composition.fractions.forEach(function(fraction){
            var amount = flow.amount * fraction.fraction,
                material = materialsData[fraction.material],
                complabel = (flow.waste) ? 'Waste' : 'Product',
                origin = actorsData[flow.origin],
                originName = (origin) ? origin.name: '',
                destination = actorsData[flow.destination],
                destinationName = (destination) ? destination.name: '',
                flowlabel = originName + ' -> ' + destinationName,
                label = flowlabel + '<br>' + complabel + ': ' + flow.composition.name + '<br>Material: ' + material.name + '<br>Amount:' + amount + ' t/year';
            flowsData[i] = {'id': flow.id, 'source': flow.origin, 'target': flow.destination, 'value': amount,
                'label' : label, 'style' : 'material' + fraction.material}
            uniqueMaterials.add(fraction.material);
            i += 1;
        });
    });

    var colorStep = 255 / (uniqueMaterials.size-1);
    var i = 0;
    uniqueMaterials.forEach(function(materialId){
        var color = i * colorStep;
        var rgb = 'rgb(' + color + ',' + color + ',' + color + ')';
        var style = { 'color': rgb };
        styles['material' + materialId] = style;
        i += 1;
    })

    return {flows: flowsData, nodes: actorsData, styles: styles};
}