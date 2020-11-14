class LoadAzgaarMap extends FormApplication {
    constructor(...args) {
    super(...args);
    game.users.apps.push(this);
    this.burgs = {};
  }

  static get defaultOptions() {
    const options = super.defaultOptions;
    options.title = "Load Azgaar's Map";
    options.id = "azgaar-foundry";
    options.template = "modules/azgaar-foundry/templates/loadAzgaarsMap.html";
    options.closeOnSubmit = true;
    options.popOut = true;
    options.width = 600;
    options.height = "auto";
    return options;
  }

  async getData() {
    return {
    };
  }

  render(force, context = {}) {
    return super.render(force, context);
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("input:file").change((event) => this.parseMap(event));
    html.find("button:submit").click((event) => this.importData(event));
  }

  loadMap(event){
    return new Promise((resolve, reject) => {
      let input = $(event.currentTarget)[0]
      let fr = new FileReader();
      let file = input.files[0];

      fr.onload = () => {
        resolve(fr.result);
      }
      fr.readAsText(file)

    });
  }

  async parseMap(event) {
    let text = await this.loadMap(event);
    /* Data format as presented in v1.4 of Azgaar's Fantasy Map Generator
    const data = [params, settings, coords, biomes, notesData, svg_xml,
      gridGeneral, grid.cells.h, grid.cells.prec, grid.cells.f, grid.cells.t, grid.cells.temp,
      features, cultures, states, burgs,
      pack.cells.biome, pack.cells.burg, pack.cells.conf, pack.cells.culture, pack.cells.fl,
      pop, pack.cells.r, pack.cells.road, pack.cells.s, pack.cells.state,
      pack.cells.religion, pack.cells.province, pack.cells.crossroad, religions, provinces,
      namesData, rivers].join("\r\n");
    */

    /* We are interested in the following fields, so extract them smartly (since order may change)
    Biomes: Biomes of the world (?)
    Cultures: Cultures
    States: Countries
    Burgs: Cities
    Religions: Relgions of the world
    Provinces: Group of Burgs in States
    namesData: Real world basis (culture) for countries/cultures.
    Rivers: Rivers
    */

    const lines = text.split(/[\r\n]+/g);
    lines.forEach((line) => {
        try {
            const obj = JSON.parse(line);

            // Provinces
            if ("state" in obj[1] && !("cell" in obj[1])) {
                console.log("Provinces:", obj)
                this.provinces = obj;
            }
            // These are our countries
            else if ("diplomacy" in obj[0]) {
                console.log("Countries:", obj)
                this.countries = obj;
            // Religions
            } else if (obj[0].name === "No religion"){
                console.log("Religions:", obj)
                this.religions = obj;
            // Cultures
            } else if (obj[0].name === "Wildlands") {
                console.log("Cultures:", obj)
                this.cultures = obj;
            // Burgs
            } else if ("population" in obj[1] && "citadel" in obj[1]) {
                console.log("Burgs:", obj)
                this.burgs = obj;
            // Rivers
            } else if ("mouth" in obj[0]) {
                console.log("Rivers:", obj)
                this.rivers = obj;
            }
        } catch (error) {
        }
      })
  }

  async importData(event){

    ui.notifications.notify("UAFMGI: Creating Journals for Cultures.")
    let cultureFolder = await Folder.create({name: "Cultures", type: "JournalEntry", parent: null})
    this.cultures.forEach((culture) => {
      if (!(jQuery.isEmptyObject(culture))){

          let content = `<div>
            <h3>${culture.name}</h3>
            <h4>Type: ${culture.type}</h4>
            <h4>Expansionism: ${culture.expansionism}</h4>
            <h4>Color: ${culture.color}</h4>
            <h4>Code: ${culture.code}</h4>
          </div>
          `

          if (culture.name){
             JournalEntry.create({
              name: culture.name,
              content: content,
              folder: cultureFolder._id,
              permission: {default: 4}
            })
         }
      }
    })

    ui.notifications.notify("UAFMGI: Creating Journals for Countries.")
    let countryFolder = await Folder.create({name: "Countries", type: "JournalEntry", parent: null})
    this.countries.forEach((country) => {
      if (!(jQuery.isEmptyObject(country) || (country.name === "Neutrals"))){
        // TODO: Extrapolate Provinces, add Burgs?, Neighbors, Diplomacy, Campaigns?, Military?
          let content = `<div>
            <h3>${country.fullName}</h3>
            <h4>Type: ${country.type}</h4>
            <h4>Expansionism: ${country.expansionism}</h4>
            <h4>Color: ${country.color}</h4>
            <h4>Culture: ${this.cultures[country.culture].name}</h4>
            <h4>Urban: ${country.urban}</h4>
            <h4>Rural: ${country.rural}</h4>
            <h4># of Burgs: ${country.burgs}</h4>
            <h4>Area: ${country.area}</h4>
            <h4>Form: ${country.form}</h4>
            <h4>Government: ${country.formName}</h4>
            <h4>Provinces: ${country.provinces}</h4> 
          </div>
          `

          if (country.name){
             JournalEntry.create({
              name: country.name,
              content: content,
              folder: countryFolder._id,
              permission: {default: 4}
            })
         }
      }
    })

    ui.notifications.notify("UAFMGI: Creating Journals for Burgs.")
    let burgFolder = await Folder.create({name: "Burgs", type: "JournalEntry", parent: null})
    this.burgs.forEach((burg) => {
      if (!(jQuery.isEmptyObject(burg))){

          let content = `<div>
            <h3>${burg.name}</h3>
            <h4>State: ${this.countries[burg.state].name}</h4>
            <h4>Culture: ${this.cultures[burg.culture].name}</h4>
            <h4>Population: ${burg.population}</h4>
            <h4>Citadel: ${burg.citadel}</h4>
            <h4>Capital: ${burg.capital}</h4>
            <h4>Port: ${burg.port}</h4>
            <h4>Plaza: ${burg.plaza}</h4>
            <h4>Walls: ${burg.walls}</h4>
            <h4>Shanty: ${burg.shanty}</h4>
            <h4>Temple: ${burg.temple}</h4>
            <h4>Feature: ${burg.feature}</h4>
          </div>
          `

          if (burg.name){
             JournalEntry.create({
              name: burg.name,
              content: content,
              folder: burgFolder._id,
              permission: {default: 4}
            })
         }
      }
    })
  }

  async _updateObject(event, formData) {
    return;
  }
}

Hooks.once("init", () => {
  game.settings.registerMenu("azgaar-foundry", "config", {
    name: "Load Map",
    label: "Load Azgaar's Map into Foundry",
    hint: "Load Azgaar's Map into Foundry",
    icon: "fas fa-desktop",
    type: LoadAzgaarMap,
    restricted: true,
  });
});