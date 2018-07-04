/*
 * Data Structure that is needed to use the class FlowMap:
 * Nodes:
 * @param {number} lon - Longitude (first part of coordinates)
 * @param {number} lat - Latitude (second part of coordinates)
 * @param {}
 *
 * Flows:
 * @param {} source - flow origin needs id that is connected to coordinates of the Data for the nodes
 * @param {} target - flow destination needs id that is connected to coordinates of the Data for the nodes
 *
 * examples from the web:
 * @param {Object} employee - The employee who is responsible for the project.
 * @param {string} employee.name - The name of the employee.
 * @param {string} employee.department - The employee's department.
 */



define([
    'd3', 'topojson', 'd3-queue', 'leaflet'
], function(d3, topojson, d3queue, L){

    class FlowMap {

        constructor(map, options) {
            var options = options || {};
            this.map = map;
            var _this = this;

            // ToDo: include this projection somehow (d3 geoMercator is used)
            //this.projection = options.projection || 'EPSG:3857';

            this.width = options.width || this.container.offsetWidth;
            this.bbox = options.bbox;
            this.height = options.height || this.width / 1.5;
            console.log(this.bbox )
            this.projection = function(coords) {
                var point = map.latLngToLayerPoint(new L.LatLng(coords[1], coords[0]));
                return [point.x, point.y];
            }

            function projectPoint(x, y) {
                var coords = _this.projection([x, y]);
                this.stream.point(point.x, point.y);
            }

            var transform = d3.geo.transform({point: projectPoint});
            this.path = d3.geo.path().projection(transform);



            this.svg = d3.select(map.getPanes().overlayPane).append("svg"),
            this.g = this.svg.append("g").attr("class", "leaflet-zoom-hide");
        }

        reset(){
            var topLeft = this.projection(this.bbox[0]),
                bottomRight = this.projection(this.bbox[1]);
            topLeft = [topLeft[0] - 50, topLeft[1] - 50];
            bottomRight = [bottomRight[0] + 50, bottomRight[1] + 50];
            console.log(topLeft)
            console.log(bottomRight)
            this.svg.attr("width", bottomRight[0] - topLeft[0])
                    .attr("height", bottomRight[1] - topLeft[1])
                .style("left", topLeft[0] + "px")
                .style("top", topLeft[1] + "px");
            this.g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");
        }

        render(nodesData, flowsData, styles) {
            this.g.selectAll("*").remove();
            // remember scope of 'this' as context for functions with different scope
            var _this = this;


//*************************Define data from flowsData: source_x, source_y, source_coord,target_x,target_y,target_coord*******************************
            var strokeWidthPerFlow = {};
            var connections = [];
            var strokeWidthArrayPerConnection = {};
            var connectionSourceTarget = {};
            this.styles = styles;

            for (var key in flowsData) {
                var source = flowsData[key].source,
                    target = flowsData[key].target;

                var connection = source + '-' + target;

                if (connections.includes(connection) === false) {                           //wenn die connection noch nicht im array connections ist, dann push sie da rein
                    connections.push(connection)                                        // wir betrachten jede connection nur einmal
                    connectionSourceTarget [key] = {'connection': connection, 'source': source, 'target': target};
                    var strokeWidths = {};                                                           // get the strokeWidths for each flow that belongs to individual connections
                    var strokeArray = [];
                    var maxValue = Math.max.apply(Math, Object.values(flowsData).map(function (flow) {
                            return flow.value
                        })),
                        maxWidth = 10;
                    for (var key in flowsData) {                                                    //welcher flow gehört zur jeweiligen connection (z.B. welcher flow geht von HAM nach LOD?)
                        var flow = flowsData[key];
                        if (flow.source + '-' + flow.target === connection) {           // berechne strokeWidth für die individuellen connections mehrmals eine connection die in connections individuell drin ist
                            var width = flow.value;
                            var strokeWidth = width / maxValue * maxWidth;

                            strokeWidths[key] = strokeWidth;
                            strokeArray.push(strokeWidth)
                        }
                    }
                    strokeWidthArrayPerConnection[connection] = strokeArray;
                    //make items array to sort the values
                    var strokeWidthsArray = Object.keys(strokeWidths).map(function (key) {
                        return [key, strokeWidths[key]];
                    });
                    ///https://stackoverflow.com/questions/25500316/sort-a-dictionary-by-value-in-javascript
                    strokeWidthsArray.sort(function (first, second) {
                        return second[1] - first[1];
                    });

                    //[[flow_id, strokewidth],[flow_id, strokewidth],[flow_id, strokewidth]] nach grösse
                    for (var i = 0; i < strokeWidthsArray.length; i++) {
                        var key = strokeWidthsArray[i][0];
                        var strokeWidth = strokeWidthsArray[i][1];
                        if (i === 0) {
                            var offset = strokeWidth / 2;
                        }
                        else {
                            var offset = strokeWidth / 2;
                            for (var j = 0; j < i; j++) {
                                offset = (offset + strokeWidthsArray[j][1])
                            }
                        }
                        strokeWidthPerFlow[key] = [strokeWidth, offset];
                    }
                }
            }
            // get all connections between two nodes that have flows in both directions
            var bothways = [];
            for (var key in connectionSourceTarget) {
                var source = connectionSourceTarget[key].source,
                    target = connectionSourceTarget[key].target;

                for (var con in connectionSourceTarget) {
                    var conSource = connectionSourceTarget[con].source,
                        conTarget = connectionSourceTarget[con].target;
                    if (source === conTarget && target === conSource) {
                        bothways.push(connectionSourceTarget[key].connection)
                    }
                }
            }


            //get the sum of all individual strokeWidths per same source & target
            var totalStrokeWidths = {};
            for (var key in strokeWidthArrayPerConnection) {
                var eachArray = strokeWidthArrayPerConnection[key],
                    totalStrokeWidthPerArray = 0;
                for (var i in eachArray) {
                    totalStrokeWidthPerArray += eachArray[i];
                }

                totalStrokeWidths[key] = totalStrokeWidthPerArray;
            }
            /*  ------------------------------------------   define data to use for drawPath and drawTotalPath   --------------------------------------------------------   */
            for (var key in flowsData) {
                // define flow, so that the loop doesn't have to start over and over again
                var flow = flowsData[key];
                // define source and target by combining nodes and flows data --> flow has source and target that are connected to nodes by IDs
                // multiple flows belong to each node, storing source and target coordinates for each flow wouldn't be efficient
                var sourceId = flow.source,
                    source = nodesData[sourceId],
                    targetId = flow.target,
                    target = nodesData[targetId];
                // insert a continue command to run through the data even if there is no source or target for some data
                if (!source || !target) {
                    console.log('Warning: missing actor for flow');
                    continue;
                }

                var sourceCoords = [source['lon'], source['lat']],
                    targetCoords = [target['lon'], target['lat']];

                //add projection to source and target coordinates
                var sxp = this.projection(sourceCoords)[0],
                    syp = this.projection(sourceCoords)[1],
                    txp = this.projection(targetCoords)[0],
                    typ = this.projection(targetCoords)[1];

                // define further adjustments for the paths: width, offset ( to see each material fraction even if they have same coordinates)
                // drawPath
                var strokeWidth = strokeWidthPerFlow[key][0],
                    offset = strokeWidthPerFlow[key][1];
                // drawTotalPath
                // get the connection (persists of source+target) from this flow data that we run the loop through and get the totalStrokeWidths for each connection
                var connection = sourceId + '-' + targetId,
                    totalStroke = totalStrokeWidths[connection];

                var sourceLevel = source.level,
                    targetLevel = target.level;




                // drawPath
                //this.drawTotalPath(sxp, syp, txp, typ, flow.labelTotal, totalStroke, sourceLevel, targetLevel, bothways, connection)
                this.drawPath(sxp, syp, txp, typ, flow.style, flow.label, offset, strokeWidth, totalStroke, sourceLevel, targetLevel, bothways, connection)


            } /******************************   End for key in flowsData    ***********************************/

            // use addpoint for each node in nodesData
            Object.values(nodesData).forEach(function (node) {
                _this.addPoint(node.lon, node.lat, node.label,
                    node.level, node.style, node.label);
            });



        }   /*********************************    /End render (nodes, flows)  **********************************/

        // inserting data and letting them load asynchronously
        renderTopo(topoJson, nodesData, flowsData, styles) {
            var _this = this;

            /*
            function drawTopo(topojson) {
                var country = _this.g.selectAll(".country").data(topojson);
                _this.g.selectAll(".country")
                    .data(topojson)
                    .enter()
                    .append("path")
                    .attr("class", "country")
                    .attr("d", _this.path)
                    .attr("id", function (d, i) {
                        return d.id;
                    })
                    .style("fill", "lightgrey")
                    .style("stroke", 'grey')
                    .style("stroke-width", 0.2);
            }
*/
            // Alle Daten werden über die queue Funktion parallel reingeladen, hier auf die Reihenfolge achten
            function loaded(error, world) {
                //world data
                var countries = topojson.feature(world, world.objects.countries).features;
                drawTopo(countries);
                _this.render(nodesData, flowsData, styles);
            }

            d3queue.queue().defer(d3.json, topoJson)
                .await(loaded);
        }

        //function to add nodes to the map
        addPoint(lon, lat, label, level, styleId, nodeLabel) {
            var x = this.projection([lon, lat])[0],
                y = this.projection([lon, lat])[1];

            // tooltip
            var tooltip = d3.select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            var point = this.g.append("g")
                .attr("class", "node")
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", this.styles[level].radius)
                .style("fill", this.styles[styleId].color)
                .style("fill-opacity", 0.85)
                .on("mouseover", function (d) {
                    d3.select(this).style("cursor", "pointer"),
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.9);
                    tooltip.html(nodeLabel)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                })
                .on("mouseout", function (d) {
                    tooltip.transition()
                            .duration(500)
                            .style("opacity", 0)
                    }
                );

        }

        adjustedPathLength(sxp, syp, txp, typ, sourceLevel, targetLevel) {
            var dxp = txp - sxp,
                dyp = typ - syp;
            var flowLength = Math.sqrt(dxp * dxp + dyp * dyp);
            var sourceReduction = this.styles[sourceLevel].radius,
                targetReduction = - this.styles[targetLevel].radius;

            // ratio between full line length and shortened line
            var sourceRatio = sourceReduction / flowLength,
                targetRatio = targetReduction / flowLength;

            // value by which line gets shorter
            var sxReductionValue = dxp * sourceRatio,
                syReductionValue = dyp * sourceRatio,
                txReductionValue = dxp * targetRatio,
                tyReductionValue = dyp * targetRatio;

            // source and target coordinates + projection + offset + adjusted length
            var sxpa = sxp + sxReductionValue,
                sypa = syp + syReductionValue,
                txpa = txp + txReductionValue,
                typa = typ + tyReductionValue;

            return [dxp, dyp, sxpa, sypa, txpa, typa, flowLength];
        }

        totalOffset(sxpa, sypa, txpa, typa, dxp, dyp, flowLength, offset, totalStroke, bothways, connection){

            if (bothways.includes(connection) === true) {
                var sxpao = sxpa + (offset) * (dyp / flowLength),
                    sypao = sypa - (offset) * (dxp / flowLength),
                    txpao = txpa + (offset) * (dyp / flowLength),
                    typao = typa - (offset) * (dxp / flowLength);
                return [sxpao, sypao, txpao, typao];
            }
            else {
                var sxpao = sxpa + (offset - (totalStroke / 2)) * (dyp / flowLength),
                    sypao = sypa - (offset - (totalStroke / 2)) * (dxp / flowLength),
                    txpao = txpa + (offset - (totalStroke / 2)) * (dyp / flowLength),
                    typao = typa - (offset - (totalStroke / 2)) * (dxp / flowLength);
                return [sxpao, sypao, txpao, typao];
            }
        }

        getPointsFromTotalPath(sxp, syp, txp, typ, totalStroke, sourceLevel, targetLevel, bothways, connection){
            var pathLengthValues = this.adjustedPathLength(sxp, syp, txp, typ, sourceLevel, targetLevel);
            var dxp = pathLengthValues[0],
                dyp = pathLengthValues[1],
                sxpa = pathLengthValues[2],
                sypa = pathLengthValues[3],
                txpa = pathLengthValues[4],
                typa = pathLengthValues[5],
                flowLength = pathLengthValues[6];

            var offset = totalStroke / 2;

            var totalOffset = this.totalOffset(sxpa, sypa, txpa, typa, dxp, dyp, flowLength, offset, totalStroke, bothways, connection);
            var sxpao = totalOffset[0],
                sypao = totalOffset[1],
                txpao = totalOffset[2],
                typao = totalOffset[3];

            return [sxpao,sypao,txpao,typao];
        }

        uuidv4() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        }

        defineTriangleData(sxpao, sypao, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp){
            var triangleData = [];
            var tReduction = - this.styles[targetLevel].radius,
                tRatio = tReduction / flowLength,
                txRValue = dxp * tRatio,
                tyRValue = dyp * tRatio,
                sxpl = sxpao + (totalStroke / 2) * (dyp / flowLength),                                                      // source left
                sypl = sypao - (totalStroke / 2) * (dxp / flowLength),
                txplb = (txpao + (totalStroke / 2) * (dyp / flowLength))+ txRValue*(totalStroke/15),                       // target left
                typlb = (typao - (totalStroke / 2) * (dxp / flowLength))+ tyRValue*(totalStroke/15),
                sxpr = sxpao - (totalStroke / 2) * (dyp / flowLength),                                                      // source right
                sypr = sypao + (totalStroke / 2) * (dxp / flowLength),
                txprb = (txpao - (totalStroke / 2) * (dyp / flowLength))+ txRValue*(totalStroke/15),                       // target right
                typrb = (typao + (totalStroke / 2) * (dxp / flowLength))+ tyRValue*(totalStroke/15);
            triangleData.push({'tx': sxpl, 'ty': sypl}, {'tx': txplb, 'ty': typlb},
                {'tx': txpao, 'ty': typao},
                {'tx': txprb, 'ty': typrb}, {'tx': sxpr, 'ty': sypr});

            return triangleData;
        }


        // To do: adjust material to material group
        drawTotalPath(sxp, syp, txp, typ, labelTotal, totalStroke, sourceLevel, targetLevel, bothways, connection) {

            var totalPoints = this.getPointsFromTotalPath(sxp, syp, txp, typ, totalStroke, sourceLevel, targetLevel, bothways, connection);
            var sxpao = totalPoints[0],
                sypao = totalPoints[1],
                txpao = totalPoints[2],
                typao = totalPoints[3];

            var adjustedPathLength = this.adjustedPathLength(sxp, syp, txp, typ, sourceLevel, targetLevel);
            var dxp = adjustedPathLength[0],
                dyp = adjustedPathLength[1],
                flowLength = adjustedPathLength[6];

            var triangleData = this.defineTriangleData(sxpao, sypao, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp);

            //unique id for each clip path is necessary
            var uid = this.uuidv4();

            // tooltip
            var tooltip = d3.select("body")
                            .append("div")
                            .attr("class", "tooltip")
                            .style("opacity", 0);

            this.drawArrowhead(sxpao, sypao, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp, uid);


            var flowsTotal = this.g.append("line")
                .attr("x1", sxpao)
                .attr("y1", sypao)
                .attr("x2", txpao)
                .attr("y2", typao)
                .attr("clip-path", "url(#clip" + uid +")")
                .attr("stroke-width", totalStroke)
                .attr("stroke", 'steelblue')
                .attr("stroke-opacity", 0.5)
                .on("mouseover", function (d) {
                    d3.select(this).style("cursor", "pointer"),
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.9);
                    tooltip.html(labelTotal)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")
                })
                .on("mouseout", function (d) {
                    tooltip.transition()
                            .duration(500)
                            .style("opacity", 0)
                    }
                );
        }



        drawPath(sxp, syp, txp, typ, styleId, label, offset, strokeWidth, totalStroke, sourceLevel, targetLevel, bothways, connection) {

            var pathLengthValues = this.adjustedPathLength(sxp, syp, txp, typ, sourceLevel, targetLevel);
            var dxp = pathLengthValues[0],
                dyp = pathLengthValues[1],
                sxpa = pathLengthValues[2],
                sypa = pathLengthValues[3],
                txpa = pathLengthValues[4],
                typa = pathLengthValues[5],
                flowLength = pathLengthValues[6];



            //unique id for each clip path is necessary
            var uid = this.uuidv4();

            // tooltip
            var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            // define the offset of each flow to be able to see individual flows with same source and target coordinates
            // define the normal, let the line go along the normal with an offset: var norm = Math.sqrt(dxp * dxp + dyp * dyp),

            var totalOffset = this.totalOffset(sxpa, sypa, txpa, typa, dxp, dyp, flowLength, offset, totalStroke, bothways, connection);
            var sxpao = totalOffset[0],
                sypao = totalOffset[1],
                txpao = totalOffset[2],
                typao = totalOffset[3];

            var totalPoints = this.getPointsFromTotalPath(sxp, syp, txp, typ, totalStroke, sourceLevel, targetLevel, bothways, connection);
            var sxpaot = totalPoints[0],
                sypaot = totalPoints[1],
                txpaot = totalPoints[2],
                typaot = totalPoints[3];

            var triangleData = this.defineTriangleData(sxpaot, sypaot, txpaot, typaot, targetLevel, totalStroke, flowLength, dxp, dyp);

            this.drawArrowhead(sxpaot, sypaot, txpaot, typaot, targetLevel, totalStroke, flowLength, dxp, dyp, uid);
            //this.drawArrowhead(sxpaot, sypaot, txpaot, typaot, targetLevel, totalStroke, flowLength, dxp, dyp);
            // txpao typao per connection und davon ausgehend dann das arrow
            //this.drawArrowhead(txp, typ, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp);
            var flows = this.g.append("line")
                .attr("x1", sxpao)
                .attr("y1", sypao)
                .attr("x2", txpao)
                .attr("y2", typao)
                .attr("stroke-width", strokeWidth)
                .attr("stroke", this.styles[styleId].color)
                //.attr("stroke-opacity", 0.5)
                .attr("clip-path", "url(#clip" + uid +")")
                .on("mouseover", function(d){
                    d3.select(this).style("cursor", "pointer"),
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                    div.html(label)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")})
                .on("mouseout", function(d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0)}
                );

        }



        drawArrowhead(sxpao, sypao, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp, id){
           var triangleData = this.defineTriangleData(sxpao, sypao, txpao, typao, targetLevel, totalStroke, flowLength, dxp, dyp);
            /*
                                                var rightTargetB = this.g.append("g")
                                                    .attr("class", "node")
                                                    .append("circle")
                                                    .attr("cx", txprb)
                                                    .attr("cy", typrb)
                                                    .attr("r", 1)
                                                    .style("fill","red")
                                                    .style("fill-opacity", 0.5);

                                                var leftTargetB = this.g.append("g")
                                                    .attr("class", "node")
                                                    .append("circle")
                                                    .attr("cx", txplb)
                                                    .attr("cy", typlb)
                                                    .attr("r", 1)
                                                    .style("fill","purple")
                                                    .style("fill-opacity", 0.5);

                                                var rightTarget = this.g.append("g")
                                                    .attr("class", "node")
                                                    .append("circle")
                                                    .attr("cx", txpr)
                                                    .attr("cy", typr)
                                                    .attr("r", 1)
                                                    .style("fill","yellow")
                                                    .style("fill-opacity", 0.5);

                                                var leftTarget = this.g.append("g")
                                                    .attr("class", "node")
                                                    .append("circle")
                                                    .attr("cx", txpl)
                                                    .attr("cy", typl)
                                                    .attr("r", 1)
                                                    .style("fill","blue")
                                                    .style("fill-opacity", 0.5);

                                                var frontTarget = this.g.append("g")
                                                    .attr("class", "node")
                                                    .append("circle")
                                                    .attr("cx", ftx)
                                                    .attr("cy", fty)
                                                    .attr("r", 1)
                                                    .style("fill","green")
                                                    .style("fill-opacity", 0.5);
                                    */
            var clip = this.g.append("clipPath")
                .attr("id", "clip"+id)
                //.attr("id", triangleData.map(function(d) {return "clip" + d.index}))
                //.attr("id", triangleData.forEach(function(d) { return "clip"}))
                .append("polygon")
                    .data(triangleData)
                    .attr("points", triangleData.map(function (d) {
                            var x = d.tx,
                                y = d.ty;
                            return [x, y].join(",");
                        }).join(" ")
                    );
        }

    }

    return FlowMap;
});

/*  TO DO   TO DO   TO DO   TO DO   TO DO

*   check if 'new Set()' can be used for unique connections

*   Zoom
*   Bounding box: zoom to minx,miny und maxx, maxy

*   Linien: Idee: sxp, syp, txp, typ individual reingeben für drawTotalPath

*   Punkte
    *   Größe nach Level (Spatial Scale Level: Individual Actor, Ward, Municipality, region, World)
    *   Farbe nach Activity Group: wer gibt diese an? Welches Farbschema wird gewählt? --> Soll mit den Säulen im Diagramm übereinstimmen

*   OpenLayers Hintergrundkarte

*   Projektionszentrum:
    *   je nach Living Lab ein Projektionszentrum angeben
    *   zoom to location, die im Diagramm angeklickt sind



Fehlende Variablen in den Daten:
*   Actors:
    *   actor group
    *   actor level


*   flows functions
        function    sx, sy, tx, ty --> with projection, offset, length adjusted
        function    offset
        function    strokeWidth

        function flow               (does this depend on offset or not if we have flows in both or one direction?)

*   nodes functions
        function    specifyNodeSize
        function    specifyNodeColor (activityGroup)

strokeWidth max anpassen nach Level und damit Größe der Nodes
*/