################################################
##
## Graph Node Selection Grammar
##
################################################

# macro
Parenthesized[exp] -> "(" _ $exp _ ")"

main -> Nodeset 
	| Nodeset _ combOp _ Nodeset

Nodeset -> source _ relation _ target
	| Parenthesized[Nodeset]

source -> nodeType nodeFilter

relation -> outEdge | inEdge
outEdge -> "-" relationName "->" outEdgeFreq
outEdgeFreq -> null 
	| Index ">"
inEdge ->  inEdgeFreq "<-" relationName "-"
inEdgeFreq -> null
	| "<" Index

target -> "*" | nodeFilter

nodeFilter -> "[" _ filterCond _ "]"
filterCond -> nodeId | arrayIndex | attribSelections
nodeId -> String
arrayIndex -> Index

attribSelections -> attribSelection
	| Parenthesized[attribSelection] _ combOp _  attribSelections

attribSelection -> "@" attribName _ attribCond
attribCond -> compOp _ compTarget
	| __ lookupOp __ lookupTarget

combOp -> AND | OR
compOp -> opEq | opNEq | opLt | opGt | opLtE | opGtE
compTarget -> String | Number
lookupOp -> "in" | "IN"
lookupTarget -> "[" _ compTarget:+ _ "]"

AND -> "&&"
OR -> "||"
opEq -> "="
opNEq -> "!="
opLt -> "<"
opGt -> ">"
opLtE -> "<="
opGtE -> ">="

attribName -> "emp" | "id"
nodeType -> "users"
relationName -> "knows"

# Numbers
Index -> _posint {% id %}

Number -> _number {% function(d) {return {'literal': parseFloat(d[0])}} %}
 
_posint ->
	[0-9] {% id %}
	| _posint [0-9] {% function(d) {return d[0] + d[1]} %}
 
_int ->
	"-" _posint {% function(d) {return d[0] + d[1]; }%}
	| _posint {% id %}
 
_float ->
	_int {% id %}
	| _int "." _posint {% function(d) {return d[0] + d[1] + d[2]; }%}
 
_number ->
	_float {% id %}
	| _float "e" _int {% function(d){return d[0] + d[1] + d[2]; } %}
#Strings
 
String -> "\"" _string "\"" {% function(d) {return {'literal':d[1]}; } %}

_string ->
	null {% function() {return ""; } %}
	| _string _stringchar {% function(d) {return d[0] + d[1];} %}

_stringchar ->
	[^\\"] {% id %}
	| "\\" [^] {% function(d) {return JSON.parse("\"" + d[0] + d[1] + "\""); } %}

# Whitespace. The important thing here is that the postprocessor
# is a null-returning function. This is a memory efficiency trick.
_ -> [\s]:*     {%  function(d) {return null; } %}
__ -> [\s]:+    {%  function(d) {return null; } %}
