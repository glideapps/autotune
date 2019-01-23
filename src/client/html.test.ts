import { optionNodeLabelOrText, optionsForNodeChildren } from "./html";

function element(html: string): Element {
    const template = document.createElement("template");
    template.innerHTML = html.trim();
    return template.content.firstElementChild!;
}

describe("optionNodeLabelOrText", () => {
    const expectLabel = (html: string) => expect(optionNodeLabelOrText(element(html), "allow textContent"));

    it("data-option", () => expectLabel(`<div data-option="x"></div>`).toBe("x"));
    it("option", () => expectLabel(`<div option="x"></div>`).toBe("x"));
    it("textContent", () => expectLabel(`<div>x</div>`).toBe("x"));
    it("prefers data-option to textContent", () => expectLabel(`<div option="x">y</div>`).toBe("x"));
    it("prefers data-option to option", () => expectLabel(`<div data-option="x" option="y">z</div>`).toBe("x"));
});

describe("optionsForNodeChildren", () => {
    const expectOptions = (html: string) => expect(optionsForNodeChildren(element(html).children));

    it("basic case", () =>
        expectOptions(`<x-autotune>
        <div option="x">Hello</div>
        <div option="y">World</div>
    </x-autotune>`).toEqual(["x", "y"]));

    it("can mix labeled options and text content", () =>
        expectOptions(`<x-autotune>
        <div option="x">a</div>
        <div>b</div>
    </x-autotune>`).toEqual(["x", "b"]));

    it("allows unique text content", () =>
        expectOptions(`<x-autotune>
        <div>a</div>
        <div>b</div>
    </x-autotune>`).toEqual(["a", "b"]));
    
    it("Legacy case", () =>
        expectOptions(`<autotune>
        <div option="x">Hello</div>
        <div option="y">World</div>
    </autotune>`).toEqual(["x", "y"]));
});
