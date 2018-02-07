const dps = require('dbpedia-sparql-client').default;

const query = `PREFIX geo:  <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX dbpo: <http://dbpedia.org/ontology/>
select distinct ?name ?lat ?long where {
    ?s rdf:type dbpo:Stadium.
    ?s rdfs:label ?name.
    ?s geo:lat ?lat.  
    ?s geo:long ?long.
    FILTER ( lang(?name) = "ja" )
}`;
dps.client().query(query).timeout(15000).asJson().then((r) => {
    r.results.bindings.forEach((item) => {
        console.log("Name: \t" + item.name.value);
        console.log("LatLng:\t" + item.lat.value + "\t" + item.long.value);
        console.log("====");
    });
}).catch((error) => {
    throw error;
});