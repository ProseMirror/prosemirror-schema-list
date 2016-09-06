const {EditorState} = require("prosemirror-state")
const {schema, sameDoc, doc, blockquote, pre, h1, h2, p, li, ol, ul, em, hr} = require("prosemirror-model/test/build")
const {selFor} = require("prosemirror-state/test/state")
const ist = require("ist")
const {wrapInList, splitListItem, liftListItem, sinkListItem} = require("../src/schema-list")

function apply(doc, command, result) {
  let state = EditorState.create({doc, selection: selFor(doc)})
  command(state, action => state = state.applyAction(action))
  ist(state.doc, result || doc, sameDoc)
}

describe("wrapInList", () => {
  let wrap = wrapInList(schema.nodes.bullet_list)
  let wrapo = wrapInList(schema.nodes.ordered_list)

  it("can wrap a paragraph", () =>
     apply(doc(p("<a>foo")), wrap, doc(ul(li(p("foo"))))))

  it("can wrap a nested paragraph", () =>
     apply(doc(blockquote(p("<a>foo"))), wrapo, doc(blockquote(ol(li(p("foo")))))))

  it("can wrap multiple paragraphs", () =>
     apply(doc(p("foo"), p("ba<a>r"), p("ba<b>z")), wrap,
           doc(p("foo"), ul(li(p("bar")), li(p("baz"))))))

  it("doesn't wrap the first paragraph in a list item", () =>
     apply(doc(ul(li(p("<a>foo")))), wrap, null))

  it("doesn't wrap the first para in a different type of list item", () =>
     apply(doc(ol(li(p("<a>foo")))), wrapo, null))

  it("does wrap the second paragraph in a list item", () =>
     apply(doc(ul(li(p("foo"), p("<a>bar")))), wrap, doc(ul(li(p("foo"), ul(li(p("bar"))))))))

  it("joins with the list item above when wrapping its first paragraph", () =>
     apply(doc(ul(li(p("foo")), li(p("<a>bar")), li(p("baz")))), wrapo,
           doc(ul(li(p("foo"), ol(li(p("bar")))), li(p("baz"))))))
})

describe("splitListItem", () => {
  let split = splitListItem(schema.nodes.list_item)

  it("has no effect outside of a list", () =>
     apply(doc(p("foo<a>bar")), split, null))

  it("has no effect on the top level", () =>
     apply(doc("<a>", p("foobar")), split, null))

  it("can split a list item", () =>
    apply(doc(ul(li(p("foo<a>bar")))), split, doc(ul(li(p("foo")), li(p("bar"))))))

  it("deletes selected content", () =>
     apply(doc(ul(li(p("foo<a>ba<b>r")))), split,
           doc(ul(li(p("foo")), li(p("r"))))))
})

describe("liftListItem", () => {
  let lift = liftListItem(schema.nodes.list_item)

  it("can lift from a nested list", () =>
     apply(doc(ul(li(p("hello"), ul(li(p("o<a><b>ne")), li(p("two")))))), lift,
           doc(ul(li(p("hello")), li(p("one"), ul(li(p("two"))))))))

  it("can lift two items from a nested list", () =>
     apply(doc(ul(li(p("hello"), ul(li(p("o<a>ne")), li(p("two<b>")))))), lift,
           doc(ul(li(p("hello")), li(p("one")), li(p("two"))))))

  it("can lift two items from a nested three-item list", () =>
     apply(doc(ul(li(p("hello"), ul(li(p("o<a>ne")), li(p("two<b>")), li(p("three")))))), lift,
           doc(ul(li(p("hello")), li(p("one")), li(p("two"), ul(li(p("three"))))))))
})

describe("sinkListItem", () => {
  let sink = sinkListItem(schema.nodes.list_item)

  it("can wrap a simple item in a list", () =>
     apply(doc(ul(li(p("one")), li(p("t<a><b>wo")), li(p("three")))), sink,
           doc(ul(li(p("one"), ul(li(p("two")))), li(p("three"))))))

  it("won't wrap the first item in a sublist", () =>
    apply(doc(ul(li(p("o<a><b>ne")), li(p("two")), li(p("three")))), sink, null))

  it("will move an item's content into the item above", () =>
     apply(doc(ul(li(p("one")), li(p("..."), ul(li(p("two")))), li(p("t<a><b>hree")))), sink,
           doc(ul(li(p("one")), li(p("..."), ul(li(p("two")), li(p("three"))))))))
})
