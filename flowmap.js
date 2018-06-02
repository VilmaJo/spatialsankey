/*
Data Structure that is needed to use the class FlowMap:
Flows:
Nodes:
 */

define([
    'd3', 'topojson', 'd3-queue'
], function(d3, topojson, d3queue){

    class FlowMap {

        constructor(container, options){
            var options = options || {};
            this.container = document.getElementById(container);

            // ToDo: include this projection somehow (d3 geoMercator is used)
            //this.projection = options.projection || 'EPSG:3857';

            this.width = options.width || this.container.offsetWidth;
            this.height = options.height || this.width / 1.5;

            this.projection = d3.geo.mercator()
                .center([25, 40])
                .translate([this.width / 2, this.height / 2])
                .scale(600);

            this.path = d3.geo.path().projection(this.projection);

            this.svg = d3.select(this.container)
                .append("svg")
                .attr("width", this.width)
                .attr("height", this.height)
                .append("g");

            this.g = this.svg.append("g");

        }

        render(nodesData, flowsData, styles){

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

                var connection = source+'-'+target;

                if (connections.includes(connection) === false){                           //wenn die connection noch nicht im array connections ist, dann push sie da rein
                    connections.push(connection)                                        // wir betrachten jede connection nur einmal
                    connectionSourceTarget [key] = {'connection':connection, 'source':source, 'target':target};
                    var strokeWidths = {};                                                           // get the strokeWidths for each flow that belongs to individual connections
                    var strokeArray = [];
                    var maxValue = Math.max.apply(Math,Object.values(flowsData).map(function(flow){return flow.value})),
                        maxWidth = 15;
                    for (var key in flowsData) {                                                    //welcher flow gehört zur jeweiligen connection (z.B. welcher flow geht von HAM nach LOD?)
                        var flow = flowsData[key];
                        if (flow.source+'-'+flow.target === connection) {           // berechne strokeWidth für die individuellen connections mehrmals eine connection die in connections individuell drin ist
                            var width= flow.value;
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
            var totalStroke={};
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
                // define flow, so that the loop doesn't have to start over and over again
                var flow = flowsData[key];
                // define source and target by combining nodes and flows data --> flow has source and target that are connected to nodes by IDs
                // multiple flows belong to each node, storing source and target coordinates for each flow wouldn't be efficient
                var sourceId = flow.source,
                    source = nodesData[sourceId],
                    targetId = flow.target,
                    target = nodesData[targetId];
                // insert a continue command to run through the data even if there is no source or target for some data
                if (!source || !target){
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
                var connection = flow.source+'-'+flow.target,
                    totalStroke = totalStrokeWidths[connection];
/*
                console.log(connection)
                flow.source === connection[0] || connection[1] &&
*/
                var sourceLevel = source.level,
                    targetLevel = target.level;

                var con = [flow.source,flow.target];

                /*
                if (connection.includes(connection) === false){                           //wenn die connection noch nicht im array connections ist, dann push sie da rein
                    connections.push(connection)
                */
                    // drawPath


                this.drawTotalPath(sxp, syp, txp, typ, flow.labelTotal, totalStroke, sourceLevel, targetLevel)
               // this.drawPath(sxp, syp, txp, typ, flow.style, flow.label, offset, strokeWidth, totalStroke, sourceLevel, targetLevel)



            } ////End for key in flowsData**********************************************************************************************************************

/*****************************************************************************************/
// addpoint for each node
            Object.values(nodesData).forEach(function(node) {
                _this.addPoint(node.lon, node.lat, node.label, node.level, node.style);
            });

        }   //End render (nodes, flows)**********************************************************************************************************************

        // inserting data and letting them load asynchronously
        renderTopo(topoJson, nodesData, flowsData, styles){
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
            function loaded(error, world) {
                //world data
                var countries = topojson.feature(world, world.objects.countries).features;
                drawTopo(countries);
                _this.render(nodesData, flowsData, styles);
            }
            d3queue.queue().defer(d3.json, topoJson)
                .await(loaded);
        }


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
            // ADJUST highest and lowest and the in between depending on level
            // formula to calculate the circle radius dependent on area: (area^(5/7)) / (Math.sqrt(2*Math.PI)
            return (((35-((level-1)*4)^(5/7))/(Math.sqrt(2*Math.PI))));
        };

        //function to add points to the map
        addPoint(lon, lat, label, level, styleId) {
            var x = this.projection([lon, lat])[0],
                y = this.projection([lon, lat])[1];

            var point = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", this.specifyNodeSize(level))
                .style("fill",this.styles[styleId].color)
                .style("fill-opacity", 0.5)
                .on("mouseover", function(d){
                    return FlowPopup.text(function(d){return label;}), d3.select(this).style("cursor", "pointer")})
                .on("mouseout", function(d) {
                    return FlowPopup.text(function(d){return " ";})});

            var FlowPopup = this.g.append("g")
                .append("text")
                .attr("dx", x)
                .attr("dy", y+2)
                .attr("text-anchor","middle")
                .style("fill","white")
                .attr("font-size","8px");

        }

        // To do: adjust material to material group
        drawTotalPath(sxp, syp, txp, typ, labelTotal, totalStrokeWidth, sourceLevel, targetLevel){

            var dxp = txp - sxp,
                dyp = typ - syp;
            var flowLength = Math.sqrt(dxp * dxp + dyp * dyp);
            var sourceReduction = 15 - this.specifyNodeSize(sourceLevel),
                targetReduction = -25 + this.specifyNodeSize(targetLevel);

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

            // tooltip
            var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

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
                .style("fill", "grey")                                                        //somehow has to be dependent on the route
                .style("fill-opacity", 0.9);

            var mx = (txp + sxp)/2,
                my = (typ + syp)/2;

            var triangleData = [];
            var tReduction = -15 + this.specifyNodeSize(targetLevel),
                tRatio = tReduction / flowLength,
                txRValue = dxp * tRatio,
                tyRValue = dyp * tRatio,
                ftx = txp + txRValue,
                fty = typ + tyRValue,
                txpl = txpa + (totalStrokeWidth/2)*(dyp/flowLength),
                typl = typa - (totalStrokeWidth/2)*(dxp/flowLength),
                txpr = txpa - (totalStrokeWidth/2)*(dyp/flowLength),
                typr = typa + (totalStrokeWidth/2)*(dxp/flowLength);
            //triangleData.push(ftx, fty, txpl, typl, txpr, typl)
            triangleData.push({'tx': ftx,'ty': fty},{'tx': txpl,'ty': typl},{'tx': txpr,'ty': typr})

            /*
            var rightTarget = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", txpr)
                .attr("cy", typr)
                .attr("r", 1)
                .style("fill","yellow")
                .style("fill-opacity", 0.5);

            var leftTarget = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", txpl)
                .attr("cy", typl)
                .attr("r", 1)
                .style("fill","blue")
                .style("fill-opacity", 0.5);

            var frontTarget = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", ftx)
                .attr("cy", fty)
                .attr("r", 1)
                .style("fill","green")
                .style("fill-opacity", 0.5);

            var middleTarget = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", txpa)
                .attr("cy", typa)
                .attr("r", 1)
                .style("fill","black")
                .style("fill-opacity", 0.5);
            */

           // data format https://stackoverflow.com/questions/13204562/proper-format-for-drawing-polygon-data-in-d3
            console.log(triangleData)
            var triangle = this.g.append("g")
                .append("polygon")
                .data(triangleData)
                .attr("points", triangleData.map(function(d){
                    var x=d.tx,
                        y=d.ty;
                        console.log(typeof(x))
                        return [x,y].join(",");
                        }).join(" ")
                    )
                .attr("fill", "none")
                .attr("stroke-width", 0.5)
                .attr("stroke", 'black')
                .attr("stroke-dasharray", "1,2")
                .attr("stroke-opacity", 0.5);


            var flowsTotal = this.g.append("line")
                .attr("x1", sxpa)
                .attr("y1", sypa)
                .attr("x2", txpa)
                .attr("y2", typa)
                .attr("stroke-width", totalStrokeWidth)
                .attr("stroke", 'grey')
                .attr("stroke-opacity", 0.5)
                //.attr("marker-end", "url(#arrow)")
                .on("mouseover", function(d){
                    d3.select(this).style("cursor", "pointer"),
                        div.transition()
                            .duration(200)
                            .style("opacity", .9);
                    div.html(labelTotal)
                        .style("left", (d3.event.pageX) + "px")
                        .style("top", (d3.event.pageY - 28) + "px")})
                .on("mouseout", function(d) {
                    div.transition()
                        .duration(500)
                        .style("opacity", 0)}
                );
        }

        drawPath(sxp, syp, txp, typ, styleId, label, offset, strokeWidth, totalStroke, sourceLevel, targetLevel) {
            // tooltip
            var div = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);

            // draw arrow
            // source: https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
            /*
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
                .style("fill", "blue");                                                         //somehow has to be dependent on the route
                */
/*
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
            */

            var dx = txp - sxp,
                dy = typ - syp;

            // define the offset of each flow to be able to see individual flows with same source and target coordinates
            // define the normal, let the line go along the normal with an offset
            var norm = Math.sqrt(dx * dx + dy * dy),

/*specify totalFlowsOffset(bothway){
    if (bothway === true){
            return sxpo = sxp + (offset)*(dy/norm),
                    sypo = syp - (offset)*(dx/norm),
                    txpo = txp + (offset)*(dy/norm),
                    typo = typ - (offset)*(dx/norm);}

      else { return  sxpo = sxp + (offset - (totalStroke/2))*(dy/norm),
                sypo = syp - (offset - (totalStroke/2))*(dx/norm),
                txpo = txp + (offset - (totalStroke/2))*(dy/norm),
                typo = typ - (offset - (totalStroke/2))*(dx/norm);}
                };
*/

                /* subtract half of the stroke width of the whole material flow (not only the fractions),
                so that the flows are in the middle and don't have one sided offset */
                sxpo = sxp + (offset - (totalStroke/2))*(dy/norm),
                sypo = syp - (offset - (totalStroke/2))*(dx/norm),
                txpo = txp + (offset - (totalStroke/2))*(dy/norm),
                typo = typ - (offset - (totalStroke/2))*(dx/norm);



            //adjust line length
            //source: http://jsfiddle.net/3SY8v/
            //distance-x-projected-offset
            var dxpo = sxpo - txpo,
                dypo = sypo - typo;
            var flowLength = Math.sqrt(dxpo * dxpo + dypo * dypo);
    // TO DO: 5 is sourceLevel oder targetLevel --> nodes.level defines nodes size which is important for line length
            var sourceReduction = 0 - this.specifyNodeSize(sourceLevel),
                targetReduction = 15 + this.specifyNodeSize(targetLevel);

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
                              .attr("stroke", this.styles[styleId].color)
                .attr("stroke-opacity", 1)
                //.attr("marker-end", "url(#arrow)")
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

    }

    return FlowMap;
});

/*  TO DO   TO DO   TO DO   TO DO   TO DO

*   Linien
    *   Bedingung Hin- und Rückflüsse

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


UNKLAR: adjust line length: warum ist das bei fraction und nicht fraction nicht gleich???????

flow mit kleinstem strokeWidth ist weiter verschoben als gesamtbreite
*/