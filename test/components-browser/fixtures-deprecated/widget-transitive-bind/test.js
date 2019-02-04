var expect = require("chai").expect;

module.exports = function(helpers) {
    var widget = helpers.mount(
        require.resolve("./index"),
        { name: "Dylan" },
        true
    );
    expect(widget).to.have.property("correctWidget", true);
    expect(widget.el.textContent).to.equal("Hello Dylan");
    widget.rerender({ name: "Anton" });
    expect(widget.el.textContent).to.equal("Hello Anton");
};

module.exports.fails = "PLS FIX";
