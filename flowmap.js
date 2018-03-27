define([
  'd3', 'topojson', 'd3-queue', 'underscore'
], function(d3, topojson, d3queue){

class FlowMap {

    constructor(container, options){
        var options = options || {};
        this.container = document.getElementById(container);
        
        // ToDo: include this projection somehow (d3 geoMercator is used)
        //this.projection = options.projection || 'EPSG:3857';
        
        this.width = options.width || this.container.offsetWidth;
        this.height = options.height || this.width / 1.5;
        console.log(d3)
        
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
    
    render(nodes, flows){
        
        // remember scope of 'this' as context for functions with different scope
        var _this = this;
        
        //nodes data
        var nodesData = {};
        nodes.forEach(function(node) {
            nodesData[node.city] = {'city':node.city,'lon':node.lon,'lat':node.lat};
        });
        
        //flows data
        var flowsData = {};
        var flowsValues = [];           //get all flow-values from flowsData to use for path stroke-width
        var links = [];                 //for multiple links with different bents
        flows.forEach(function(flow) {
            flowsData[flow.id] = {'id':flow.id,'source':flow.source,'target':flow.target,'value':flow.value,'type':flow.type};
            flowsValues.push(parseInt(flow.value));
            var data = {source: flow.source, target: flow.target};
            links.push(data);
        });

        /*
        Define data from flowsData: source_x, source_y, source_coord,target_x,target_y,target_coord
        */
        for(key in flowsData) {
            // console.log(key)
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
                 flow = [source, target];
                console.log(flow)


            /* Pseudocode, um die Anzahl gleicher flows zu kriegen
                var flowQuantity = 0;

                for each source, target same
                - count + 1, wenn source & target in flowsData gleich sind 
                - if (count = 7) {return bend 0:0.7;}
                    else if (count = 6) {return bend 0:0.6;}
                array.length()
                if (array.length = 7) {return bend 0:0.7;}
                */
        
        //color	
               var color = flowsData[key].type;
        
        //define strokeWidth
                var maxValue = Math.max.apply(null, flowsValues),
                maxWidth = 12,
                width= flowsData[key].value;
        
            this.strokeWidth = width / maxValue * maxWidth;
            /***********************************************************************************************************************/
    // quantity of flows with same source and target
    // source: http://bl.ocks.org/thomasdobber/9b78824119136778052f64a967c070e0
            console.log(links)


        // drawPath
            this.drawPath(sourceX, sourceY, targetX, targetY, links, color)
        
        
        } //End for key in flowsData


        //**********************************************************************************************************************
// Adjust point size
// get values per source
// get the value for each individual source (that you find in node.city)
        var valuePerSource = {},
            valuePerTarget = {},
            valuePerPie = {},
            pointValueSource = [],
            pointValueTarget = [];

        //run through nodes and get the flow.values per flow.source and flow.target which are put into objects and arrays defined above
        nodes.forEach(function(node){
            // get value per source element
            var valueSource = 0,
                valueTarget = 0;
            flows.forEach(function(flow){                       //  for each flow, if source == node.city add the flow.value to the defined value
                if (flow.source == node.city){
                    //console.log(flow.value)
                    valueSource = valueSource + parseInt(flow.value);
                }
                if (flow.target == node.city){
                    valueTarget = valueTarget + parseInt(flow.value);
                }
            });
            valuePerSource[node.city] = valueSource;
            valuePerTarget[node.city] = valueTarget;
            valuePerPie[node.city] = [valueSource,valueTarget];
            pointValueSource.push(valuePerSource[node.city]);     //pointValue to get the values for calculating the max value
            pointValueTarget.push(valuePerTarget[node.city]);
        });
        // get point size
        var maxSourceValue = Math.max.apply(null,pointValueSource),
        maxTargetValue = Math.max.apply(null,pointValueTarget),
        maxPointSize = 12;
        // run through valuePerSource
        for (var key in valuePerSource){
            var pointSizeSource=(valuePerSource[key] / maxSourceValue * maxPointSize);             // calculate for each key the pointSize (value/maxValue * maxPointSize)
            valuePerSource[key] = pointSizeSource;                                          // like push: put the pointSize-Values into the object valuePerSource for each key
        };
        for (var key in valuePerTarget){
            var pointSizeTarget=(valuePerTarget[key] / maxTargetValue * maxPointSize);
            valuePerTarget[key] = pointSizeTarget;
        }
// addpoint for each node
        nodes.forEach(function(node) {
            var pointSizeSource=valuePerSource[node.city],                //under the valuePerSource object are pointSize - values per city which are calculated above; here we take the values
            pointSizeTarget=valuePerTarget[node.city],
            pieSize=valuePerPie[node.city],
            //pointSizeSum for the pie chart radius
            pointSizeSum = pointSizeSource + pointSizeTarget;
            _this.addPoint(node.lon, node.lat,pointSizeSum,pieSize);
            //pieChart(pointSizeSum);
        });

    //**********************************************************************************************************************

    } 

    
    renderCsv(topoJson, nodesCsv, flowsCsv){
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
        function loaded(error, world, nodes, flows) {
            //world data
            var countries = topojson.feature(world, world.objects.countries).features;
            drawTopo(countries);
            _this.render(nodes, flows);
        }
        d3queue.queue().defer(d3.json, topoJson)
                       .defer(d3.csv, nodesCsv)
                       .defer(d3.csv, flowsCsv)
                       .await(loaded);
    
    }


    //function to add points to the map
    addPoint(lon, lat, pointSizeSum, pieSize) {
        var x = this.projection([lon, lat])[0];
        var y = this.projection([lon, lat])[1];
    
        var point = this.g.append("g")
                          .attr("class", "gpoint")
                          .append("circle")
                          .attr("cx", x)
                          .attr("cy", y)
                          .style("fill","#c95f64")
                          .style("fill-opacity", 1.0)
                          .attr("r", pointSizeSum);
        // Größe der Punkte abhängig nach in & outflows
        //& farbe abhängig, ob mehr in- oder outflows
    }

    /*
                   // Pie chart variables:
               // source: https://bl.ocks.org/Andrew-Reid/838aa0957c6492eaf4590c5bc5830a84
                   var g2 = svg.append("g");
                   var arc = d3.arc()
                       .innerRadius(0)
                       .outerRadius(radius);
                   var pie = d3.pie()
                       .sort(null)
                       .value(function(d) { return d; });
                   var pieColor = d3.schemeCategory10;
               // Draw pie charts
               // source: https://bl.ocks.org/Andrew-Reid/838aa0957c6492eaf4590c5bc5830a84
                       var points = g2.selectAll("g")
                           .enter()
                           .append("g")
                           .attr("cx", x)
                           .attr("cy", y)
                           .attr("class","pies")
                           .attr("r", pointSizeSum);
                           //.append("text")
                           //.attr("y", -radius - 5)
                           //.text("text",'hallo')
                           //.style('text-anchor','middle');
                       var pies = points.selectAll(".pies")
                       // split([","])
                           .data(function(d) { return pie(d.data.split(['-'])); })
                           .enter()
                           .append('g')
                           .attr('class','arc')
                           .append("path")
                           .attr('d',arc)
                           .attr("fill",function(d,i){
                               return color[i+1];
                           });
   */

    //function makeArc, that is used for drawPath
    makeArc(sx, sy, tx, ty, links) {
        //sx,sy,tx,ty mit projection versehen
        var sxp = this.projection([sx,sy])[0],
            syp = this.projection([sx,sy])[1],
            txp = this.projection([tx,ty])[0],
            typ = this.projection([tx,ty])[1];

        _.each(links, function(link){
            var same = _.where(links, {
                'source':link.source,
                'target':link.target
            });
            var sameAlt = _.where(links, {
                'source':link.target,
                'target':link.source
            });
            var sameAll = same.concat(sameAlt);


            _.each(sameAll, function (s,i) {
                s.sameIndex = (i + 1);
                s.sameTotal = (sameAll.length);
                s.sameTotalHalf = (s.sameTotal/2);
                s.sameUneven = ((s.sameTotal % 2) !== 0);
                s.sameMiddleLink = ((s.sameUneven == true) && (Math.ceil(s.sameTotalHalf) === s.sameIndex));
                s.sameLowerHalf = (s.sameIndex <= s.sameTotalHalf);
                s.sameArcDirection = s.sameLowerHalf ? 0 : 1;                           // Krümmung wird nach links und rechts aufgeteilt
                s.sameIndexCorrected = s.sameLowerHalf ? s.sameIndex : (s.sameIndex - Math.ceil(s.sameTotalHalf)); // sameIndex corrected gibt die untere und oebere hälfte an
            });
        });
        var maxSame = _.chain(links)
            .sortBy(function(x) {
                return x.sameTotal;
            })
            .last()
            .value().sameTotal;
        _.each(links, function(link) {
            link.maxSameHalf = Math.floor(maxSame / 3);
        });

        var dx = txp - sxp,
            dy = typ - syp,
            dr = Math.sqrt(dx * dx + dy * dy),
            unevenCorrection = (links.sameUneven ? 0 : 0.5),
            arc = ((dr * links.maxSameHalf) / (links.sameIndexCorrected - unevenCorrection));
        if (links.sameMiddleLink) {
            arc = 0;
        }

        return "M" + sxp + "," + syp + "A" + dr + "," + dr +" 0 0,1 " + txp + "," + typ;
        //return "M" + sxp + "," + syp + "A" + arc + "," + arc + " 0 0," + links.sameArcDirection + " " + txp + "," + txp;
    };

    specifyColor(color) {
        if (color === 'organic') {return '#2e7b50';}
        if (color === 'plastic') {return '#4682b4';}
        if (color === 'construction') {return '#cc8400';}
        if (color === 'food') {return '#ebda09';}
        if (color === 'msw') {return '#348984';}
        if (color === 'hazardous') {return '#893464';}
        return 'white';
    }

    drawPath(sx,sy,tx,ty,links,color) {
        // draw arrow
        // source: https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
        var arrow = this.svg.append("marker")
                            .attr("id", "arrow")
                            .attr("refX", 6)
                            .attr("refY", 6)
                            .attr("markerWidth", 10)
                            .attr("markerHeight", 10)
                            .attr("orient", "auto")
                            .append("path")
                            .attr("d", "M 3 5.5 3.5 5.5" +      //left
                                " 4 6 " +                       //up
                                " 3.5 6.5  3 6.5 " +            //right
                                "3.5 6")                        //down
                            .style("fill", "black");
    
    
        var route = this.g.insert("path")
                        .attr("class", "route")
                        .attr("id","route")
                        .attr("d", this.makeArc(sx,sy,tx,ty,links))
                        .style("stroke", this.specifyColor (color))
                        .style("stroke-width", this.strokeWidth)
                        //.style("stroke-dasharray", "9, 2")
                        .attr("marker-end", "url(#arrow)");
    }
}

return FlowMap;
});

/*
Aktuelle AUFGABEN
        *** - Farbe nach type
        *** - StrokeWidth: Breite nach value
		        Vorgehen: value / maxValue * maxStrokeWidth
- Punkte
    *** Größe der Punkte abhängig nach in & outflows
    - PieChart mit Anteilen für in und outflows: https://bl.ocks.org/Andrew-Reid/838aa0957c6492eaf4590c5bc5830a84

-Linien
    - Richtung anzeigen: 1 arrow mit marker-start oder marker-end, aber: bei bend funktioniert es nicht (bend einfügen) und anzeige in bestimmtem abstand
        - arcTween: mit animation?
        -transition https://github.com/d3/d3-transition#transition_attrTween
        - chained transition (dashedarray?)https://bl.ocks.org/mbostock/70d5541b547cc222aa02
- bend anpassen nach Anzahl von flows: bzw bend nach typ, da an gleicher stelle sein soll?
- Beziers statt arcs??
    - Bedingung einfügen: wenn type gleiches target xy und source xy hat, dann hintereinander verlaufen
*/

