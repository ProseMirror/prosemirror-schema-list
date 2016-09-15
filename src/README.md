This module exports list-related schema elements and commands. The
commands assume which assume lists to be nestable, but with the
restriction that the first child of a list item is a plain paragraph.

These are the node specs:

@orderedList
@bulletList
@listItem

You can extend a schema with this helper function.

@addListNodes

Using this would look something like this:

    const mySchema = new Schema({
      nodes: addListNodes(baseSchema.nodeSpec, "paragraph block*", "block"),
      marks: baseSchema.markSpec
    })

The following functions are [commands](#commands):

@wrapInList
@splitListItem
@liftListItem
@sinkListItem
