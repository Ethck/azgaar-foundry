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

  importData(event){
    console.log(this.burgs);
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