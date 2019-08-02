var expect = require("chai").expect;

module.exports = async function(helpers) {
    helpers.mount(require.resolve("./index"), {});
    if (!helpers.isHydrate) {
        expect(helpers.targetEl.textContent).to.equal("Loading...");
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    expect(helpers.targetEl.textContent).to.equal("Hello Marko!");
};
