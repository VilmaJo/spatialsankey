define([
    'd3', 'topojson', 'd3-queue', 'leaflet'
], function(d3, topojson, d3queue){

    class FlowMap {

        constructor(container, options){
            var options = options || {};
            this.container = document.getElementById(container);

            // ToDo: include this projection somehow (d3 geoMercator is used)
            //this.projection = options.projection || 'EPSG:3857';

            this.width = options.width || this.container.offsetWidth;
            this.height = options.height || this.width / 1.5;
            console.log(d3);
            console.log(topojson);

            this.projection = d3.geo.mercator()
                .center([25, 43])
                .translate([this.width / 2, this.height / 2])
                .scale(950);

            this.path = d3.geo.path().projection(this.projection);

            this.svg = d3.select(this.container)
                .append("svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .append("g");

            this.g = this.svg.append("g");

        }

        render(nodes, flows, material){

            // remember scope of 'this' as context for functions with different scope
            var _this = this;

    //nodes data
            var nodesData = {};
            nodes.forEach(function (node) {
                nodesData[node.city] = {'city': node.city, 'lon': node.lon, 'lat': node.lat, 'level': node.level,
                                        'level_name': node.level_name, 'activity-group': node.activityGroup};
            });

    //flows data
            var flowsData = {};
            var flowsValues = [];           //get all flow-values from flowsData to use for path stroke-width
            flows.forEach(function (flow) {
                flowsData[flow.id] = {'id': flow.id, 'source': flow.source, 'target': flow.target, 'value': flow.value, 'type': flow.type};
                flowsValues.push(parseInt(flow.value));
            });

    //material data
            var materialData = {};

            material.forEach(function(d) {
                materialData[d.id]={'id':d.id.toString(), 'parent':d.parent.toString(), 'name':d.name, 'level':d.level};
            });

/*
        //count sum of each individual parent to geht highest
            // to find out highest amount of flows with same source & target per  --> result: 9
                var parents = [];
                for (var key in materialData) {
                    var name = materialData[key].name,
                        id = materialData[key].id,
                        parent = materialData[key].parent;

                    parents.push(parent)
                }
                console.log(parents)
                parents.sort();

                var current = null;
                var cnt = 0;
                var countsComplete = [];

                for (var i=0;i<parents.length;i++){
                    if (parents[i] != current){
                        if (cnt > 0){
                            console.log(current + ' comes ' + cnt + ' times');
                            countsComplete.push(cnt);
                        }
                        current = parents[i];
                        cnt = 1;
                    }
                    else {cnt ++;}
                }
                if (cnt > 0){
                    console.log(current + ' comes' + cnt + ' times');
                    countsComplete.push(cnt)
                }
                countsComplete.sort();
                console.log(countsComplete)
*/


//*************************Define data from flowsData: source_x, source_y, source_coord,target_x,target_y,target_coord*******************************
            var strokeWidthPerFlow = {};
            var connections = [];
            var strokeWidthArrayPerConnection = {};
            var connectionSourceTarget = {};
            for (var key in flowsData) {
                var source = flowsData[key].source,
                    target = flowsData[key].target;

                var connection = source+target;

                if (connections.includes(connection) === false){                           //wenn die connection noch nicht im array connections ist, dann push sie da rein
                    connections.push(connection)                                        // wir betrachten jede connection nur einmal
                    connectionSourceTarget [key] = {'connection':connection, 'source':source, 'target':target};
                    var strokeWidths = {};                                                           // get the strokeWidths for each flow that belongs to individual connections
                    var strokeArray = [];
                    for (var key in flowsData) {                                                    //welcher flow gehört zur jeweiligen connection (z.B. welcher flow geht von HAM nach LOD?)
                        if (flowsData[key].source + flowsData[key].target === connection) {           // berechne strokeWidth für die individuellen connections mehrmals eine connection die in connections individuell drin ist
                            var maxValue = Math.max.apply(null, flowsValues),
                                maxWidth = 3,
                                width= flowsData[key].value;
                            var strokeWidth = width / maxValue * maxWidth;

                            strokeWidths[key] = strokeWidth;
                            strokeArray.push(strokeWidth)
                        }
                    }
                    strokeWidthArrayPerConnection[connection]=strokeArray;
                    //make items array to sort the values
                    var strokeWidthsArray = Object.keys(strokeWidths).map(function(key) {
                        return [key, strokeWidths[key]];
                    });
                    ///https://stackoverflow.com/questions/25500316/sort-a-dictionary-by-value-in-javascript
                    strokeWidthsArray.sort(function(first, second) {
                        return second[1] - first[1];
                    });

                    //[[flow_id, strokewidth],[flow_id, strokewidth],[flow_id, strokewidth]] nach grösse
                    for (var i=0;i<strokeWidthsArray.length;i++){
                        var key = strokeWidthsArray[i][0];
                        var strokeWidth = strokeWidthsArray[i][1];
                        if (i===0){
                            var offset = strokeWidth/2;
                        }
                        else{
                            var offset = strokeWidth/2;
                            for (var j=0;j<i;j++){
                                offset = (offset + strokeWidthsArray[j][1])
                            }
                        }
                        strokeWidthPerFlow[key] = [strokeWidth, offset];
                    }
                }
            }

            //get the sum of all individual strokeWidths per same source & target
            var totalStrokeWidths ={};
            for ( var key in strokeWidthArrayPerConnection) {
                var eachArray = strokeWidthArrayPerConnection[key],
                    totalStrokeWidthPerArray = 0;
                    for (var i in eachArray){
                        totalStrokeWidthPerArray += eachArray[i];
                    }
                    totalStrokeWidths[key] = totalStrokeWidthPerArray;
            }


            for (var key in flowsData) {
                //source
                var source = flowsData[key].source,             //die source wird aus den flowsData je key gezogen
                    sourceX = nodesData[source]['lon'],         //die source aus flowsData ist der key in nodesData und daraus werden koordinaten gezogen
                    sourceY = nodesData[source]['lat'],
                    sourceCoords = [sourceX, sourceY],
                    //target
                    target = flowsData[key].target,
                    targetX = nodesData[target]['lon'],
                    targetY = nodesData[target]['lat'],
                    targetCoords = [targetX, targetY],
                    //flow für Krümmung
                    flow = [source, target],
                    flowCoords = [sourceCoords, targetCoords];

                //color
                var type = flowsData[key].type,
                    value = flowsData[key].value,
                    sourceLevel = nodesData[source]['level'],
                    targetLevel = nodesData[target]['level'];

                strokeWidth = strokeWidthPerFlow[key][0]
                offset = strokeWidthPerFlow[key][1]

                // drawPath
                this.drawPath(sourceX, sourceY, targetX, targetY, type, value, offset, strokeWidth, sourceLevel, targetLevel)
            } ////End for key in flowsData**********************************************************************************************************************

/*****************************************************************************************/
// addpoint for each node
            nodes.forEach(function(node) {
                _this.addPoint(node.lon, node.lat, node.city, node.level, node.activityGroup);
            });

        }   //End render (nodes, flows)**********************************************************************************************************************

        renderCsv(topoJson, nodesCsv, flowsCsv, materialJson){
            var _this = this;

            function drawTopo(topojson) {
                var country = _this.g.selectAll(".country").data(topojson);
                _this.g.selectAll(".country")
                    .data(topojson)
                    .enter()
                    .append("path")
                    .attr("class", "country")
                    .attr("d", _this.path)
                    .attr("id", function(d,i) { return d.id; })
                    .style("fill", "lightgrey");
            }

            // Alle Daten werden über die queue Funktion parallel reingeladen, hier auf die Reihenfolge achten
            function loaded(error, world, nodes, flows, material) {
                //world data
                var countries = topojson.feature(world, world.objects.countries).features;
                drawTopo(countries);
                _this.render(nodes, flows, material);
            }
            d3queue.queue().defer(d3.json, topoJson)
                .defer(d3.csv, nodesCsv)
                .defer(d3.csv, flowsCsv)
                .defer(d3.json,materialJson)
                .await(loaded);
        }


        specifyNodeColor(activityGroup) {
            if (activityGroup === '1' || activityGroup === '2' || activityGroup === '3') {return '#2e7b50';}
            if (activityGroup === '4' ) {return '#348984';}
            if (activityGroup === '5' ) {return '#4682b4';}
            if (activityGroup === '6' ) {return '#cc8400';}
            return '#c95f64';
        };


        specifyLineColor(type) {
            if (type === 'organic') {return '#2e7b50';}
            if (type === 'plastic') {return '#4682b4';}
            if (type === 'construction') {return '#cc8400';}
            if (type === 'food') {return '#ebda09';}
            if (type === 'msw') {return '#348984';}
            if (type === 'hazardous') {return '#893464';}
            return 'white';
        };

        specifyArrowColor(type) {
            if (type === 'organic') {return "url(#arrow1)";}
            if (type === 'plastic') {return "url(#arrow2)";}
            if (type === 'construction') {return "url(#arrow3)";}
            if (type === 'food') {return "url(#arrow4)";}
            if (type === 'msw') {return "url(#arrow5)";}
            if (type === 'hazardous') {return "url(#arrow6)";}
            return "url(#arrow1)";
        };

        specifyNodeSize(level){
            // adjust node-size by different area and not radius to have a proportional size effect
            if (level === '1') {return ((35^(5/7))/Math.sqrt(2*Math.PI));}
            if (level === '2') {return ((31^(5/7))/Math.sqrt(2*Math.PI));}
            if (level === '3') {return ((27^(5/7))/Math.sqrt(2*Math.PI));}
            if (level === '4') {return ((23^(5/7))/Math.sqrt(2*Math.PI));}
            if (level === '5') {return ((19^(5/7))/Math.sqrt(2*Math.PI));}
            /*
            if (level === '1') {return 15;}
            if (level === '2') {return 13;}
            if (level === '3') {return 11;}
            if (level === '4') {return 9;}
            if (level === '5') {return 7;}
            */
            return 10;
        }

        //function to add points to the map
        addPoint(lon, lat, city, level, activityGroup) {
            var x = this.projection([lon, lat])[0],
                y = this.projection([lon, lat])[1];

            var point = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", this.specifyNodeSize(level))
                .style("fill",this.specifyNodeColor(activityGroup))
                .style("fill-opacity", 0.8)
                .on("mouseover", function(d){
                    return label.text(function(d){return city;}), d3.select(this).style("cursor", "pointer")})
                .on("mouseout", function(d) {
                    return label.text(function(d){return " ";})});

            var label = this.g.append("g")
                .append("text")
                .attr("dx", x)
                .attr("dy", y+2)
                .style("fill", "white")
                .style("font-size","6px")
                .attr("text-anchor","middle");
        }


        drawPath(sx, sy, tx, ty, type, value, offset, strokeWidth, sourceLevel, targetLevel) {

            // draw arrow
            // source: https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
            var arrow = this.svg.append("marker")
                .attr("id", "arrow")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "grey"); //somehow has to be dependent on the route

            var arrow1 = this.svg.append("marker")
                .attr("id", "arrow1")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#2e7b50"); //somehow has to be dependent on the route

            var arrow2 = this.svg.append("marker")
                .attr("id", "arrow2")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#4682b4"); //somehow has to be dependent on the route

            var arrow3 = this.svg.append("marker")
                .attr("id", "arrow3")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#cc8400"); //somehow has to be dependent on the route

            var arrow4 = this.svg.append("marker")
                .attr("id", "arrow4")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#ebda09"); //somehow has to be dependent on the route

            var arrow5 = this.svg.append("marker")
                .attr("id", "arrow5")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#348984"); //somehow has to be dependent on the route

            var arrow6 = this.svg.append("marker")
                .attr("id", "arrow6")
                .attr("refX", 3.5)      //defines position on the line
                .attr("refY", 6)
                .attr("markerWidth", 10)
                .attr("markerHeight", 10)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M 3 5.5 3.5 5.5" +      //left
                    " 4.5 6 " +                       //up
                    " 3.5 6.5  3 6.5 " +            //right
                    "3.5 6")                        //down
                .style("fill", "#893464"); //somehow has to be dependent on the route


            //add projection to sx,sy,tx,ty
            var sxp = this.projection([sx,sy])[0],
                syp = this.projection([sx,sy])[1],
                txp = this.projection([tx,ty])[0],
                typ = this.projection([tx,ty])[1];

            var dx = txp - sxp,
                dy = typ - syp;

            // define the offset of each flow to be able to see individual flows with same source and target coordinates
            // define the normal, let the line go along the normal with an offset
            var norm = Math.sqrt(dx * dx + dy * dy),
                sxpo = sxp + offset *(dy/norm),
                sypo = syp - offset *(dx/norm),
                txpo = txp + offset *(dy/norm),
                typo = typ - offset *(dx/norm);
                /* totalStrokeWidth of all strokes added up between two points
                sxpo = sxp + (offset - totalStrokeWidth/2)*(dy/norm),
                sypo = syp - (offset - totalStrokeWidth/2)*(dx/norm),
                txpo = txp + (offset - totalStrokeWidth/2)*(dy/norm),
                typo = typ - (offset - totalStrokeWidth/2)*(dx/norm);
                */

            // tooltip
            var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            //adjust line length
            //source: http://jsfiddle.net/3SY8v/
            //distance-x-projected-offset
            var dxpo = sxpo - txpo,
                dypo = sypo - typo;
            var flowLength = Math.sqrt(dxpo * dxpo + dypo * dypo);

            var sourceReduction = - this.specifyNodeSize(sourceLevel) ,
                targetReduction = 5 + this.specifyNodeSize(targetLevel);

            // ratio between full line length and shortened line
            var sourceRatio = sourceReduction / flowLength,
                targetRatio = targetReduction / flowLength;

            // value by which line gets shorter
            var sxReductionValue = dxpo * sourceRatio,
                syReductionValue = dypo * sourceRatio,
                txReductionValue = dxpo * targetRatio,
                tyReductionValue = dypo * targetRatio;

            // source and target coordinates + projection + offset + adjusted length
            var sxpoa = sxpo + sxReductionValue,
                sypoa = sypo + syReductionValue,
                txpoa = txpo + txReductionValue,
                typoa = typo + tyReductionValue;


            var flows = this.g.append("line")
                              .attr("x1", sxpoa)
                              .attr("y1", sypoa)
                              .attr("x2", txpoa)
                              .attr("y2", typoa)
                              .attr("stroke-width", strokeWidth)
                              .attr("stroke", this.specifyLineColor (type))
                .attr("stroke-opacity", 0.85)
                .attr("marker-end", this.specifyArrowColor (type))
                .on("mouseover", function(d){
                     d3.select(this).style("cursor", "pointer"),
                         div.transition()
                             .duration(200)
                             .style("opacity", .9);
                         div.html("Material: " + type + "<br/>" + "Fraction: " + value)
                             .style("left", (d3.event.pageX) + "px")
                             .style("top", (d3.event.pageY - 28) + "px")})
                .on("mouseout", function(d) {
                        div.transition()
                            .duration(500)
                            .style("opacity", 0)}
                );
    /*
            var flowsTotal = this.g.append("line")
                                    .attr("x1", sxpoa)
                                    .attr("y1", sypoa)
                                    .attr("x2", txpoa)
                                    .attr("y2", typoa)
                                    .attr("stroke-width", totalStrokeWidth)
                                    .attr("stroke", 'grey')
                                    .attr("stroke-opacity", 0.85)
                                    .attr("marker-end", "url(#arrow)")
                                    .on("mouseover", function(d){
                                        d3.select(this).style("cursor", "pointer"),
                                            div.transition()
                                                .duration(200)
                                                .style("opacity", .9);
                                        div.html("Material: " + type + "<br/>" + "Fraction: " + value)
                                            .style("left", (d3.event.pageX) + "px")
                                            .style("top", (d3.event.pageY - 28) + "px")})
                                    .on("mouseout", function(d) {
                                        div.transition()
                                            .duration(500)
                                            .style("opacity", 0)}
                                    );
        */

        }
    }

    return FlowMap;
});

// group elements: https://www.dashingd3js.com/svg-group-element-and-d3js