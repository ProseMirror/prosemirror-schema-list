const {findWrapping, liftTarget, canSplit, ReplaceAroundStep} = require("../transform")
const {Block, Attribute, Slice, Fragment, NodeRange} = require("../model")

// ::- An ordered list node type. Has a single attribute, `order`,
// which determines the number at which the list starts counting, and
// defaults to 1.
class OrderedList extends Block {
  get attrs() { return {order: new Attribute({default: 1})} }
  get matchDOMTag() {
    return {"ol": dom => ({
      order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1
    })}
  }
  toDOM(node) {
    return ["ol", {start: node.attrs.order == 1 ? null : node.attrs.order}, 0]
  }
}
exports.OrderedList = OrderedList

// ::- A bullet list node type.
class BulletList extends Block {
  get matchDOMTag() { return {"ul": null} }
  toDOM() { return ["ul", 0] }
}
exports.BulletList = BulletList

// ::- A list item node type.
class ListItem extends Block {
  get matchDOMTag() { return {"li": null} }
  toDOM() { return ["li", 0] }
}
exports.ListItem = ListItem

// :: (OrderedMap, string, ?string) → OrderedMap
// Convenience function for adding list-related node types to a map
// describing the nodes in a schema. Adds `OrderedList` as
// `"ordered_list"`, `BulletList` as `"bullet_list"`, and `ListItem`
// as `"list_item"`. `itemContent` determines the content expression
// for the list items. If you want the commands defined in this module
// to apply to your list structure, it should have a shape like
// `"paragraph block*"`, a plain textblock type followed by zero or
// more arbitrary nodes. `listGroup` can be given to assign a group
// name to the list node types, for example `"block"`.
function addListNodes(nodes, itemContent, listGroup) {
  return nodes.append({
    ordered_list: {type: OrderedList, content: "list_item+", group: listGroup},
    bullet_list: {type: BulletList, content: "list_item+", group: listGroup},
    list_item: {type: ListItem, content: itemContent}
  })
}
exports.addListNodes = addListNodes

// !! This module exports a number of list-related commands, which
// assume lists to be nestable, but with the restriction that the
// first child of a list item is not a list.

// :: (NodeType, ?Object) → (state: EditorState, onAction: ?(action: Action)) → bool
// Returns a command function that wraps the selection in a list with
// the given type an attributes. If `apply` is `false`, only return a
// value to indicate whether this is possible, but don't actually
// perform the change.
function wrapInList(nodeType, attrs) {
  return function(state, onAction) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to), doJoin = false, outerRange = range
    // This is at the top of an existing list item
    if (range.depth >= 2 && $from.node(range.depth - 1).type.compatibleContent(nodeType) && range.startIndex == 0) {
      // Don't do anything if this is the top of the list
      if ($from.index(range.depth - 1) == 0) return false
      let $insert = state.doc.resolve(range.start - 2)
      outerRange = new NodeRange($insert, $insert, range.depth)
      if (range.endIndex < range.parent.childCount)
        range = new NodeRange($from, state.doc.resolve($to.end(range.depth)), range.depth)
      doJoin = true
    }
    let wrap = findWrapping(outerRange, nodeType, attrs, range)
    if (!wrap) return false
    if (onAction) onAction(doWrapInList(state.tr, range, wrap, doJoin, nodeType).scrollAction())
    return true
  }
}
exports.wrapInList = wrapInList

function doWrapInList(tr, range, wrappers, joinBefore, nodeType) {
  let content = Fragment.empty
  for (let i = wrappers.length - 1; i >= 0; i--)
    content = Fragment.from(wrappers[i].type.create(wrappers[i].attrs, content))

  tr.step(new ReplaceAroundStep(range.start - (joinBefore ? 2 : 0), range.end, range.start, range.end,
                                new Slice(content, 0, 0), wrappers.length, true))

  let found = 0
  for (let i = 0; i < wrappers.length; i++) if (wrappers[i].type == nodeType) found = i + 1
  let splitDepth = wrappers.length - found

  let splitPos = range.start + wrappers.length - (joinBefore ? 2 : 0), parent = range.parent
  for (let i = range.startIndex, e = range.endIndex, first = true; i < e; i++, first = false) {
    if (!first && canSplit(tr.doc, splitPos, splitDepth)) tr.split(splitPos, splitDepth)
    splitPos += parent.child(i).nodeSize + (first ? 0 : 2 * splitDepth)
  }
  return tr
}

// :: (NodeType) → (state: EditorState) → bool
// Build a command that splits a non-empty textblock at the top level
// of a list item by also splitting that list item.
function splitListItem(nodeType) {
  return function(state, onAction) {
    let {$from, $to, node} = state.selection
    if ((node && node.isBlock) || !$from.parent.content.size ||
        $from.depth < 2 || !$from.sameParent($to)) return false
    let grandParent = $from.node(-1)
    if (grandParent.type != nodeType) return false
    let nextType = $to.pos == $from.end() ? grandParent.defaultContentType($from.indexAfter(-1)) : null
    let tr = state.tr.delete($from.pos, $to.pos)
    if (!canSplit(tr.doc, $from.pos, 2, nextType)) return false
    if (onAction) onAction(tr.split($from.pos, 2, nextType).scrollAction())
    return true
  }
}
exports.splitListItem = splitListItem

// :: (NodeType) → (state: EditorState, onAction: ?(action: Action)) → bool
// Create a command to lift the list item around the selection up into
// a wrapping list.
function liftListItem(nodeType) {
  return function(state, onAction) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == nodeType)
    if (!range || range.depth < 2 || $from.node(range.depth - 1).type != nodeType) return false
    if (onAction) {
      let tr = state.tr, end = range.end, endOfList = $to.end(range.depth)
      if (end < endOfList) {
        // There are siblings after the lifted items, which must become
        // children of the last item
        tr.step(new ReplaceAroundStep(end - 1, endOfList, end, endOfList,
                                      new Slice(Fragment.from(nodeType.create(null, range.parent.copy())), 1, 0), 1, true))
        range = new NodeRange(tr.doc.resolveNoCache($from.pos), tr.doc.resolveNoCache(endOfList), range.depth)
      }
      onAction(tr.lift(range, liftTarget(range)).scrollAction())
    }
    return true
  }
}
exports.liftListItem = liftListItem

// :: (NodeType) → (state: EditorState, onAction: ?(action: Action)) → bool
// Create a command to sink the list item around the selection down
// into an inner list.
function sinkListItem(nodeType) {
  return function(state, onAction) {
    let {$from, $to} = state.selection
    let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == nodeType)
    if (!range) return false
    let startIndex = range.startIndex
    if (startIndex == 0) return false
    let parent = range.parent, nodeBefore = parent.child(startIndex - 1)
    if (nodeBefore.type != nodeType) return false

    if (onAction) {
      let nestedBefore = nodeBefore.lastChild && nodeBefore.lastChild.type == parent.type
      let inner = Fragment.from(nestedBefore ? nodeType.create() : null)
      let slice = new Slice(Fragment.from(nodeType.create(null, Fragment.from(parent.copy(inner)))),
                            nestedBefore ? 3 : 1, 0)
      let before = range.start, after = range.end
      onAction(state.tr.step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after,
                                                   before, after, slice, 1, true))
               .scrollAction())
    }
    return true
  }
}
exports.sinkListItem = sinkListItem
