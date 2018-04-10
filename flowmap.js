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
        console.log(d3);
        
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
        var TV;
        var _this = this;

        //nodes data
        var nodesData = {};
        nodes.forEach(function (node) {
            nodesData[node.city] = {'city': node.city, 'lon': node.lon, 'lat': node.lat};
        });

        //flows data
        var flowsData = {};
        var flowsValues = [];           //get all flow-values from flowsData to use for path stroke-width
        var typeValue = {};
        //var typeValue = {};
        flows.forEach(function (flow) {
            flowsData[flow.id] = {'id': flow.id, 'source': flow.source, 'target': flow.target, 'value': flow.value, 'type': flow.type};
            flowsValues.push(parseInt(flow.value));
            typeValue[flow.type] = {'value': flow.value, 'type': flow.type};
        });
        console.log(flowsData)
        console.log(typeValue)

//*************************Define data from flowsData: source_x, source_y, source_coord,target_x,target_y,target_coord*******************************
        //var typeValue = {};
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
                flow = [source, target];

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
            var type = flowsData[key].type;
            var tgk = [flowsData[key].type, flowsData[key].value];

        //define strokeWidth
                var maxValue = Math.max.apply(null, flowsValues),
                maxWidth = 8,
                width= flowsData[key].value;
             this.strokeWidth = width / maxValue * maxWidth;
            // add condition: if (strokeWidth<0.2) {return 1} else return strokeWidth;

         //type + value
           typeValue[type]={'type':type, 'stroke': this.strokeWidth};
            var offset = typeValue[type];
            console.log(offset)
            var organic;
            var plastic;
            var construction;
            var food;
            var msw;
            var hazardous;
            //if (offset.type === 'organic') {organic = offset.stroke;}
            if (type === 'organic') {organic = offset.stroke;}
            else if (type === 'plastic') {plastic = offset.stroke;}
            else if (type === 'construction') {construction = offset.stroke;}
            else if (type === 'food') {food = offset.stroke;}
            else if (type === 'msw') {msw = offset.stroke;}
            else if (type === 'hazardous') {hazardous = offset.stroke;}
            else {return 'hello'};

            // wenn der type stimmt, dann wird stroke des types übernommen
            // aber wenn ein anderer type, dann wird der stroke des zuletzt durchlaufene gleichen types auch für andere types übernommen
            // define bundle of flows with same source and target?
           console.log(plastic)


       // drawPath
        this.drawPath(sourceX, sourceY, targetX, targetY, type, typeValue, offset)

        }   ////End for key in flowsData**********************************************************************************************************************

// addpoint for each node
        nodes.forEach(function(node) {
                 _this.addPoint(node.lon, node.lat);
        });

    }   //End render (nodes, flows)**********************************************************************************************************************
    
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
    addPoint(lon, lat) {
        var x = this.projection([lon, lat])[0],
            y = this.projection([lon, lat])[1];


        var point = this.g.append("g")
                          .attr("class", "gpoint")
                          .append("circle")
                          .attr("cx", x)
                          .attr("cy", y)
                          .style("fill","#c95f64")
                          .style("fill-opacity", 1.0)
                          .attr("r", 8);
    }
    //pieChart
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
    makeArc(sx, sy, tx, ty, type, typeValue, offset) {


        //add projection to sx,sy,tx,ty
        var sxp = this.projection([sx,sy])[0],
            syp = this.projection([sx,sy])[1],
            txp = this.projection([tx,ty])[0],
            typ = this.projection([tx,ty])[1];

        var dx = txp - sxp,
            dy = typ - syp,
            dr = Math.sqrt(dx * dx + dy * dy),

            mx = (txp + sxp)/2,             // x and y for the center point between the nodes
            my = (typ + syp)/2;

        // offset wird angepasst mit strokewidth

        var organic = typeValue.organic = this.strokeWidth,
            plastic = typeValue.plastic = this.strokeWidth,
            construction = typeValue.construction = this.strokeWidth,
            food = typeValue.food = this.strokeWidth,
            msw = typeValue.msw = this.strokeWidth,
            hazardous = typeValue.hazardous = this.strokeWidth;

        console.log(organic)

        //for each typeValue.type return value

        var offset = 0                                              // vorgehen: ich packe in meinen koffer
            if (type === 'organic') {offset = offset.stroke;}                   // organic.value, organic.value + plastic.value + construction.value
            else if (type === 'plastic') {offset = organic;}              // organic.value + plastic.value,
            else if (type === 'construction') {offset = organic + plastic;}        // organic.value + plastic.value + construction.value
            else if (type === 'food') {offset = organic + plastic + construction;}                // ...
            else if (type === 'msw') {offset = organic + plastic + construction + food;}
            else if (type === 'hazardous') {offset = organic + plastic + construction + food + msw;};


        var norm = Math.sqrt((dx*dx)+(dy*dy)),
            sxpo = sxp + offset*(dy/norm),
            sypo = syp - offset*(dx/norm),
            txpo = txp + offset*(dy/norm),
            typo = typ - offset*(dx/norm);
        /*
        var sourceOffset = this.g.append("g")
            .attr("class", "sourceOffset")
            .append("circle")
            .attr("cx", sxpo)
            .attr("cy", sypo)
            .style("fill","green")
            .style("fill-opacity", 1.0)
            .attr("r", 8);

        var targetOffset = this.g.append("g")
            .attr("class", "sourceOffset")
            .append("circle")
            .attr("cx", txpo)
            .attr("cy", typo)
            .style("fill","orange")
            .style("fill-opacity", 1.0)
            .attr("r", 8);
        */

        //add symbol: arrow or triangle?
        var middlePoint = this.g.append("g")
            .attr("class", "mpoint")
            .append("circle")
            .attr("cx", mx)
            .attr("cy", my)
            .style("fill","#b2b2b2")
            .style("fill-opacity", 1.0)
            .attr("r", 2);

        //return "M" + sxp + "," + syp + "," + txp + "," + typ;     // simple line
        return "M" + sxpo + "," + sypo + "," + txpo + "," + typo;      // simple line + offset which depends on strokeWidth

    };


    specifyColor(type) {
        if (type === 'organic') {return '#2e7b50';}
        if (type === 'plastic') {return '#4682b4';}
        if (type === 'construction') {return '#cc8400';}
        if (type === 'food') {return '#ebda09';}
        if (type === 'msw') {return '#348984';}
        if (type === 'hazardous') {return '#893464';}
        return 'white';
    };

    specifyColorArrow(type) {
        if (type === 'organic') {return "url(#arrow1)";}
        if (type === 'plastic') {return "url(#arrow2)";}
        if (type === 'construction') {return "url(#arrow3)";}
        if (type === 'food') {return "url(#arrow4)";}
        if (type === 'msw') {return "url(#arrow5)";}
        if (type === 'hazardous') {return "url(#arrow6)";}
        return "url(#arrow1)";
    };

    drawPath(sx, sy, tx, ty, type, typeValue, offset) {
        // draw arrow
        // source: https://stackoverflow.com/questions/36579339/how-to-draw-line-with-arrow-using-d3-js
        var arrow1 = this.svg.append("marker")
                            .attr("id", "arrow1")
                            .attr("refX", 3.5)      //defines position on the line
                            .attr("refY", 6)
                            .attr("markerWidth", 10)
                            .attr("markerHeight", 10)
                            .attr("orient", "auto")
                            .append("path")
                            .attr("d", "M 3 5.5 3.5 5.5" +      //left
                                " 4 6 " +                       //up
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
                " 4 6 " +                       //up
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
                " 4 6 " +                       //up
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
                " 4 6 " +                       //up
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
                " 4 6 " +                       //up
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
                " 4 6 " +                       //up
                " 3.5 6.5  3 6.5 " +            //right
                "3.5 6")                        //down
            .style("fill", "#893464"); //somehow has to be dependent on the route

        var route = this.g.insert("path")
                        .attr("class", "route")
                        .attr("id","route")
                        .attr("d", this.makeArc(sx, sy, tx, ty, type, offset))
                        .style("stroke", this.specifyColor (type))
                        .style("stroke-width", this.strokeWidth)
                        //.style("stroke-opacity", 0.7)
                        //.style("stroke-dasharray", "9, 2")
                        //.attr("marker-end", "url(#arrow1)")
                        .attr("marker-end", this.specifyColorArrow (type))
                        //.attr("marker-mid","url(#middlePoint)");
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

    - Bei Klick auf den Punkt erscheint ein Tortendiagramm mit Anteilen der jeweiligen Materials (type)

-Linien
    - Richtung anzeigen: 1 arrow mit marker-start oder marker-end, aber: bei bend funktioniert es nicht (bend einfügen) und anzeige in bestimmtem abstand
        - arcTween: mit animation?
        - transition https://github.com/d3/d3-transition#transition_attrTween
        - chained transition (dashedarray?)https://bl.ocks.org/mbostock/70d5541b547cc222aa02
        - marker end: line.length - line.lengt/10 --> hierfür wird aber x und y koordinaten benötigt:
                        vorgehen: line-length, dann davon einen anteil zurück, hier die x und y coordinaten bestimmen und an dieser stelle ist marker end
- bend anpassen nach Anzahl von flows: bzw bend nach typ, da an gleicher stelle sein soll?
    Bend: Aabhängigkeit des bends von strokewidth --> zu komplziert? erst muss verstanden werden wie sich die anteile nach außen hin verkleinern
    *** - reihenfolge der linien festlegen
    *** - bend je bestimmtem typ wie bei farben festlegen
    *
    * mittelpunkt zwischen zwei punkten finden auf dem arc, zum nächsten mittelpunkt bestimmter abstand?


- Beziers statt arcs??
    - Bedingung einfügen: wenn type gleiches target xy und source xy hat, dann hintereinander verlaufen
*/

