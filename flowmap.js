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
            var data = {id: flow.id, source: flow.source, target: flow.target};
            links.push(data);
        });

// multiple links  ****************************************************************************************************************************
// quantity of flows with same source and target
// source: http://bl.ocks.org/thomasdobber/9b78824119136778052f64a967c070e0
/*
maybe to complicated for our aim? try to use s.sameTotal und define bend für each amount-class.
think about if we need to divide into left and right?

pseudocode: var maxLinks = math.max(s.sameTotal)
            how to define bend-->  0:0.8? OR for s.sameTotal + 1, bend + 0.1 OR divide into array from max and min
            if s.sameTotal = 7, bend 0:0.7

            bend war bei "dr = Math.sqrt(dx * dx + dy * dy) * bend", aber wir müssen definieren, wenn mehrere Linien, dann bends verteilen

            nur "same" nutzen, denn sameAlt ist ja in die andere Richtung? einfacher mit der Richtungsangabe?

            we have  "same" --> all links which have same source and target (somehow they repeat?)
            we need to define bend in a value field (from:to)

*/
        _.each(links, function(link){
            var same = _.where(links, {'source':link.source, 'target':link.target});
            //console.log(same)
            var sameAlt = _.where(links, {'source':link.target, 'target':link.source});

            var sameAll = same.concat(sameAlt);

            //links data is expanded by the following variables
            _.each(sameAll, function (s,i) {
                s.sameIndex = (i + 1);
                //console.log(s.sameIndex)
                s.sameTotal = (sameAll.length);                                                                         // amount of same links between two nodes
                //console.log(s.sameTotal);
                s.sameTotalHalf = (s.sameTotal/2);
                s.sameUneven = ((s.sameTotal % 2) !== 0);
                s.sameMiddleLink = ((s.sameUneven == true) && (Math.ceil(s.sameTotalHalf) === s.sameIndex));
                s.sameLowerHalf = (s.sameIndex <= s.sameTotalHalf);
                s.sameArcDirection = s.sameLowerHalf ? 0 : 1;                                                           // Bends are divided to the left and right side
                s.sameIndexCorrected = s.sameLowerHalf ? s.sameIndex : (s.sameIndex - Math.ceil(s.sameTotalHalf));      // sameIndex corrected gibt die untere und oebere hälfte an
                //console.log(s.sameIndexCorrected)
            });
        });
        //console.log(links)
        var maxSame = _.chain(links)                                    // the maximum amount of same links
            .sortBy(function(x) {
                return x.sameTotal;
            })
            .last()
            .value().sameTotal;

        _.each(links, function(link) {
            link.maxSameHalf = Math.floor(maxSame / 3);
        });

        var linksData = {};
        links.forEach(function(link) {
            //console.log(link);
            linksData[link.id] = {'sameIndex':link.sameIndex, 'sameTotal':link.sameTotal,
                'sameTotalHalf':link.sameTotalHalf, 'sameUneven':link.sameUneven,
                'sameMiddleLink':link.sameMiddleLink, 'sameLowerHalf':link.sameLowerHalf,
                'sameArcDirection':link.sameArcDirection, 'sameIndexCorrected':link.sameIndexCorrected,
                'source':link.source, 'target':link.target, 'maxSameHalf':link.maxSameHalf}
        });
// multiple links END  *******************************************************END*********************************************************************



//*************************Define data from flowsData: source_x, source_y, source_coord,target_x,target_y,target_coord*******************************
        // change this into flows.forEach and then use this also for the links, because we need to loop through and write function in here or write a function to get the data? insert into function?
        for(var key in flowsData, linksData) {
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
               var type = flowsData[key].type

        //define strokeWidth
                var maxValue = Math.max.apply(null, flowsValues),
                maxWidth = 8,
                width= flowsData[key].value;
            this.strokeWidth = width / maxValue * maxWidth;

        var link = linksData[key]
            //console.log(link)
       // drawPath

        this.drawPath(sourceX, sourceY, targetX, targetY, link, type)

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
        var x = this.projection([lon, lat])[0];
        var y = this.projection([lon, lat])[1];
    
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
    makeArc(sx, sy, tx, ty, link, type) {
        // define object out of links array
        //sx,sy,tx,ty mit projection versehen
        var sxp = this.projection([sx,sy])[0],
            syp = this.projection([sx,sy])[1],
            txp = this.projection([tx,ty])[0],
            typ = this.projection([tx,ty])[1];

        //define bend for arc path (links between points)
        var bend = 0;
            if (type === 'organic') {bend = 0.9;}
            else if (type === 'plastic') {bend = 0.66;}
            else if (type === 'construction') {bend = 0.57;}
            else if (type === 'food') {bend = 0.53;}
            else if (type === 'msw') {bend = 0.505;}
            else if (type === 'hazardous') {bend = 0.5;}

        var dx = txp - sxp,
            dy = typ - syp,
            dr = Math.sqrt(dx * dx + dy * dy) * bend;

        return "M" + sxp + "," + syp + "A" + dr + "," + dr +" 0 0,1 " + txp + "," + typ;

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

    drawPath(sx,sy,tx,ty,link,type) {
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
                        .attr("d", this.makeArc(sx,sy,tx,ty,link,type))
                        .style("stroke", this.specifyColor (type))
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


- Beziers statt arcs??
    - Bedingung einfügen: wenn type gleiches target xy und source xy hat, dann hintereinander verlaufen
*/

