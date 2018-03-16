## 1.0.1 (2018-03-16)

### Bug fixes

Fixes a bug that caused [`wrapInList`](https://prosemirror.net/docs/ref/#schema-list.wrapInList) to split list items in the wrong place.

## 0.23.0 (2017-09-13)

### Bug fixes

The [`splitListItem` command](http://prosemirror.net/docs/ref/version/0.23.0.html#schema-list.splitListItem) now splits the parent list item when executed in a (trailing) empty list item in a nested list.

## 0.20.0 (2017-04-03)

### New features

The [`liftListItem`](http://prosemirror.net/docs/ref/version/0.20.0.html#schema-list.liftListItem) command can now lift items out of a list entirely, when the parent node isn't another list.

## 0.11.0 (2016-09-21)

### Breaking changes

New module combining the node [specs](http://prosemirror.net/docs/ref/version/0.11.0.html#model.NodeSpec) from
[schema-basic](http://prosemirror.net/docs/ref/version/0.11.0.html#schema-basic), and the list-related
[commands](http://prosemirror.net/docs/ref/version/0.11.0.html#commands) from the commands module.

