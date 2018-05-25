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

            this.projection = d3.geo.mercator()
                .center([25, 43])
                .translate([this.width / 2, this.height / 2])
                .scale(750);

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
                    var maxValue = Math.max.apply(Math,Object.values(flowsData).map(function(flow){return flow.value}))
                    for (var key in flowsData) {                                                    //welcher flow gehört zur jeweiligen connection (z.B. welcher flow geht von HAM nach LOD?)
                        var flow = flowsData[key];
                        if (flow.source+'-'+flow.target === connection) {           // berechne strokeWidth für die individuellen connections mehrmals eine connection die in connections individuell drin ist
                            var maxWidth = 10,
                                width= flow.value;
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
                var flow = flowsData[key];
                var sourceId = flow.source,             //die source wird aus den flowsData je key gezogen
                    source = nodesData[sourceId],
                    targetId = flow.target,
                    target = nodesData[targetId];
                if (!source || !target){
                    console.log('Warning: missing actor for flow');
                    continue;
                }
                var sourceX = source['lon'],         //die source aus flowsData ist der key in nodesData und daraus werden koordinaten gezogen
                    sourceY = source['lat'],
                    sourceCoords = [sourceX, sourceY],
                    //target
                    targetX = target['lon'],
                    targetY = target['lat'],
                    targetCoords = [targetX, targetY],
                    //flow für Krümmung
                    //flow = [sourceId, targetId],
                    flowCoords = [sourceCoords, targetCoords];

                strokeWidth = strokeWidthPerFlow[key][0]
                offset = strokeWidthPerFlow[key][1]
                // drawPath

                this.drawPath(sourceX, sourceY, targetX, targetY, flow.style, flow.label, offset, strokeWidth)
            } ////End for key in flowsData**********************************************************************************************************************

/*****************************************************************************************/
// addpoint for each node
            Object.values(nodesData).forEach(function(node) {
                _this.addPoint(node.lon, node.lat, node.label, node.level, node.style);
            });

        }   //End render (nodes, flows)**********************************************************************************************************************

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
        addPoint(lon, lat, label, level, styleId) {
console.log(this.styles[styleId].color)
            var x = this.projection([lon, lat])[0],
                y = this.projection([lon, lat])[1];

            var point = this.g.append("g")
                .attr("class", "gpoint")
                .append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", this.specifyNodeSize(level))
                .style("fill",this.styles[styleId].color)
                //.style("fill-opacity", 0.8)
                .on("mouseover", function(d){
                    return label2.text(function(d){return label;}), d3.select(this).style("cursor", "pointer")})
                .on("mouseout", function(d) {
                    return label2.text(function(d){return " ";})});

            var label2 = this.g.append("g")
                .append("text")
                .attr("dx", x)
                .attr("dy", y+2)
                .style("fill", "white")
                .style("font-size","6px")
                .attr("text-anchor","middle");
        }


        drawPath(sx, sy, tx, ty, styleId, label, offset, strokeWidth) {
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
            */

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
    // TO DO: 5 is sourceLevel oder targetLevel --> nodes.level defines nodes size which is important for line length
            var sourceReduction = - this.specifyNodeSize(5) ,
                targetReduction = 5 + this.specifyNodeSize(5);

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
                //.attr("marker-end", this.styles[styleId].color)
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