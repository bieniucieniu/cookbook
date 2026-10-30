package com.bieniucieniu.cookbook.features.recipes.graph

const val MAX_CONFIGURATIONS = 64

enum class GateMode { None, And, Xor }

enum class SpanKind { Active, Wait }

enum class ToolHold { Active, Span }

enum class Presence { AllPaths, SomePaths }

data class InputSpan(val ord: Int, val kind: SpanKind, val seconds: Int)

data class InputIngredient(
    val ingredientId: Long,
    val optional: Boolean,
)

data class InputTool(
    val toolId: Long,
    val optional: Boolean,
    val hold: ToolHold,
)

data class InputNode(
    val key: String,
    val branch: GateMode,
    val join: GateMode,
    val repeatMin: Int,
    val repeatMax: Int,
    val spans: List<InputSpan>,
    val ingredients: List<InputIngredient>,
    val tools: List<InputTool>,
)

data class InputEdge(val from: String, val to: String)

data class InputGraph(
    val cooks: Int,
    val nodes: List<InputNode>,
    val edges: List<InputEdge>,
)

class GraphFailure(val errors: List<String>) : RuntimeException(errors.joinToString("; "))

data class TimeTotals(
    val handsOnMinSeconds: Int,
    val handsOnMaxSeconds: Int,
    val elapsedMinSeconds: Int,
    val elapsedMaxSeconds: Int,
)

data class AltConfig(
    val nodes: Set<String>,
    val ingredients: Set<Long>,
    val tools: Set<Long>,
)

data class Analysis(
    val ingredientFacts: Map<Long, Presence>,
    val toolFacts: Map<Long, Presence>,
    val time: TimeTotals,
    val parallelPairs: Set<Pair<String, String>>,
    val alternatives: List<AltConfig>,
)

private data class Slice(
    val start: Long,
    val end: Long,
    val busy: Boolean,
    val tools: Set<Long>,
) {
    fun shift(by: Long) = copy(start = start + by, end = end + by)
}

private data class Timeline(
    val ready: Long,
    val hands: Long,
    val slices: List<Slice>,
    val ingredients: Set<Long>,
    val tools: Set<Long>,
    val nodes: Set<String>,
) {
    companion object {
        val EMPTY = Timeline(0, 0, emptyList(), emptySet(), emptySet(), emptySet())
    }
}

fun analyze(graph: InputGraph): Analysis {
    val structure = validate(graph)
    val minTs = evaluate(structure, maxRepeat = false)
    val maxTs = evaluate(structure, maxRepeat = true)
    return Analysis(
        ingredientFacts = facts(minTs.map { it.ingredients }),
        toolFacts = facts(minTs.map { it.tools }),
        time = TimeTotals(
            handsOnMinSeconds = minTs.minOf { it.hands }.toSeconds(),
            handsOnMaxSeconds = maxTs.maxOf { it.hands }.toSeconds(),
            elapsedMinSeconds = minTs.minOf { it.ready }.toSeconds(),
            elapsedMaxSeconds = maxTs.maxOf { it.ready }.toSeconds(),
        ),
        parallelPairs = parallelPairs(structure),
        alternatives = minTs.map { AltConfig(it.nodes, it.ingredients, it.tools) },
    )
}

private data class Structure(
    val graph: InputGraph,
    val nodeByKey: Map<String, InputNode>,
    val successors: Map<String, List<String>>,
    val predecessors: Map<String, List<String>>,
    val ipdom: Map<String, String>,
    val source: String,
)

private fun validate(graph: InputGraph): Structure {
    val errors = mutableListOf<String>()
    if (graph.cooks < 1) errors += "cooks must be >= 1"
    if (graph.nodes.isEmpty()) errors += "recipe needs one step"
    val keys = graph.nodes.map { it.key }
    if (keys.any { it.isBlank() }) errors += "step key must be non-blank"
    if (keys.size != keys.toSet().size) errors += "step keys must be unique"
    val nodeByKey = graph.nodes.associateBy { it.key }
    for (node in graph.nodes) {
        if (node.repeatMin < 1 || node.repeatMax < node.repeatMin) {
            errors += "step ${node.key} repeat range is invalid"
        }
        val ords = node.spans.map { it.ord }
        if (ords.size != ords.toSet().size) errors += "step ${node.key} span ord must be unique"
        if (node.spans.any { it.seconds < 0 }) errors += "step ${node.key} span seconds must be >= 0"
        val ingredientIds = node.ingredients.map { it.ingredientId }
        if (ingredientIds.size != ingredientIds.toSet().size) {
            errors += "step ${node.key} repeats an ingredient"
        }
        val toolIds = node.tools.map { it.toolId }
        if (toolIds.size != toolIds.toSet().size) errors += "step ${node.key} repeats a tool"
    }
    for (edge in graph.edges) {
        if (edge.from !in nodeByKey || edge.to !in nodeByKey) {
            errors += "edge ${edge.from} -> ${edge.to} references an unknown step"
        }
        if (edge.from == edge.to) errors += "step ${edge.from} must not link to itself"
    }
    val edgePairs = graph.edges.map { it.from to it.to }
    if (edgePairs.size != edgePairs.toSet().size) errors += "edges must be unique"
    if (errors.isNotEmpty()) throw GraphFailure(errors)

    val successors = graph.nodes.associate { node ->
        node.key to graph.edges.filter { it.from == node.key }.map { it.to }
    }
    val predecessors = graph.nodes.associate { node ->
        node.key to graph.edges.filter { it.to == node.key }.map { it.from }
    }
    for (node in graph.nodes) {
        val out = successors.getValue(node.key).size
        val inn = predecessors.getValue(node.key).size
        val branchOk = if (out <= 1) node.branch == GateMode.None else node.branch != GateMode.None
        val joinOk = if (inn <= 1) node.join == GateMode.None else node.join != GateMode.None
        if (!branchOk) errors += "step ${node.key} branchMode does not match its outgoing edges"
        if (!joinOk) errors += "step ${node.key} joinMode does not match its incoming edges"
    }
    val sources = graph.nodes.filter { predecessors.getValue(it.key).isEmpty() }
    val sinks = graph.nodes.filter { successors.getValue(it.key).isEmpty() }
    if (sources.size != 1) errors += "graph must have one start step"
    if (sinks.size != 1) errors += "graph must have one end step"
    if (hasCycle(successors)) errors += "graph has a cycle"
    if (errors.isNotEmpty()) throw GraphFailure(errors)

    val source = sources.single().key
    val sink = sinks.single().key
    val ipdom = immediatePostDominators(keys, successors, sink)
    for (node in graph.nodes) {
        if (node.branch == GateMode.None) continue
        val join = ipdom[node.key]
        if (join == null || join == node.key) {
            errors += "step ${node.key} does not join"
            continue
        }
        val joinNode = nodeByKey.getValue(join)
        if (joinNode.join != node.branch) {
            errors += "step ${node.key} ${node.branch.name.lowercase()} split joins a ${joinNode.join.name.lowercase()} step"
        }
        val region = regionNodes(node.key, join, successors)
        for (step in region) {
            for (pred in predecessors.getValue(step)) {
                if (pred != node.key && pred !in region) {
                    errors += "edge $pred -> $step enters the ${node.key} region"
                }
            }
            for (next in successors.getValue(step)) {
                if (next != join && next !in region) {
                    errors += "edge $step -> $next leaves the ${node.key} region"
                }
            }
        }
        for (next in successors.getValue(node.key)) {
            if (next != join && next !in region) {
                errors += "edge ${node.key} -> $next leaves the ${node.key} region"
            }
        }
    }
    if (errors.isNotEmpty()) throw GraphFailure(errors)
    return Structure(graph, nodeByKey, successors, predecessors, ipdom, source)
}

internal fun immediatePostDominators(
    nodeKeys: Collection<String>,
    successors: Map<String, List<String>>,
    sink: String,
): Map<String, String> {
    val reverse = nodeKeys.associateWith { mutableListOf<String>() }.toMutableMap()
    for ((from, tos) in successors) {
        for (to in tos) reverse.getValue(to).add(from)
    }
    return dominators(nodeKeys, reverse.mapValues { it.value.toList() }, sink)
}

private fun dominators(
    nodeKeys: Collection<String>,
    successors: Map<String, List<String>>,
    start: String,
): Map<String, String> {
    val rpo = reversePostorder(start, successors)
    val index = rpo.withIndex().associate { it.value to it.index }
    val preds = nodeKeys.associateWith { mutableListOf<String>() }.toMutableMap()
    for ((from, tos) in successors) {
        for (to in tos) preds.getValue(to).add(from)
    }
    val idom = HashMap<String, String>()
    idom[start] = start
    var changed = true
    while (changed) {
        changed = false
        for (block in rpo) {
            if (block == start) continue
            val defined = preds.getValue(block).filter { it in idom }
            if (defined.isEmpty()) continue
            var newIdom = defined.first()
            for (pred in defined.drop(1)) newIdom = intersect(pred, newIdom, idom, index)
            if (idom[block] != newIdom) {
                idom[block] = newIdom
                changed = true
            }
        }
    }
    return idom
}

private fun intersect(
    left: String,
    right: String,
    idom: Map<String, String>,
    index: Map<String, Int>,
): String {
    var fingerLeft = left
    var fingerRight = right
    while (fingerLeft != fingerRight) {
        while (index.getValue(fingerLeft) > index.getValue(fingerRight)) {
            fingerLeft = idom.getValue(fingerLeft)
        }
        while (index.getValue(fingerRight) > index.getValue(fingerLeft)) {
            fingerRight = idom.getValue(fingerRight)
        }
    }
    return fingerLeft
}

private fun reversePostorder(start: String, successors: Map<String, List<String>>): List<String> {
    val seen = HashSet<String>()
    val post = mutableListOf<String>()
    fun visit(key: String) {
        if (!seen.add(key)) return
        for (next in successors[key].orEmpty()) visit(next)
        post.add(key)
    }
    visit(start)
    return post.asReversed()
}

private fun hasCycle(successors: Map<String, List<String>>): Boolean {
    val state = HashMap<String, Int>()
    fun visit(key: String): Boolean {
        when (state[key]) {
            1 -> return true
            2 -> return false
        }
        state[key] = 1
        for (next in successors.getValue(key)) {
            if (visit(next)) return true
        }
        state[key] = 2
        return false
    }
    return successors.keys.any { visit(it) }
}

private fun regionNodes(
    split: String,
    join: String,
    successors: Map<String, List<String>>,
): Set<String> {
    val region = HashSet<String>()
    fun visit(key: String) {
        if (key == join || !region.add(key)) return
        for (next in successors.getValue(key)) visit(next)
    }
    for (next in successors.getValue(split)) visit(next)
    region.remove(split)
    return region
}

private fun parallelPairs(structure: Structure): Set<Pair<String, String>> {
    val pairs = HashSet<Pair<String, String>>()
    for (node in structure.graph.nodes) {
        if (node.branch != GateMode.And) continue
        val join = structure.ipdom.getValue(node.key)
        val arms = structure.successors.getValue(node.key).map { start ->
            armNodes(start, join, structure.successors)
        }
        for (left in arms.indices) {
            for (right in left + 1 until arms.size) {
                for (a in arms[left]) {
                    for (b in arms[right]) {
                        pairs += if (a < b) a to b else b to a
                    }
                }
            }
        }
    }
    return pairs
}

private fun armNodes(
    start: String,
    join: String,
    successors: Map<String, List<String>>,
): Set<String> {
    if (start == join) return emptySet()
    val nodes = HashSet<String>()
    fun visit(key: String) {
        if (key == join || !nodes.add(key)) return
        for (next in successors.getValue(key)) visit(next)
    }
    visit(start)
    return nodes
}

private fun evaluate(structure: Structure, maxRepeat: Boolean): List<Timeline> {
    val timelines = walk(structure, structure.source, until = null, maxRepeat)
    if (timelines.size > MAX_CONFIGURATIONS) {
        throw GraphFailure(listOf("recipe has more than $MAX_CONFIGURATIONS configurations"))
    }
    return timelines
}

private fun walk(
    structure: Structure,
    start: String,
    until: String?,
    maxRepeat: Boolean,
): List<Timeline> {
    if (start == until) return listOf(Timeline.EMPTY)
    var timelines = listOf(Timeline.EMPTY)
    var current: String? = start
    while (current != null && current != until) {
        val node = structure.nodeByKey.getValue(current)
        val repeats = if (maxRepeat) node.repeatMax else node.repeatMin
        val piece = nodeTimeline(node, repeats)
        timelines = cap(timelines.map { seq(it, piece) })
        if (node.branch == GateMode.None) {
            current = structure.successors.getValue(current).singleOrNull()
            continue
        }
        val join = structure.ipdom.getValue(current)
        val arms = structure.successors.getValue(current).map { arm ->
            walk(structure, arm, join, maxRepeat)
        }
        timelines = combine(timelines, arms, node.branch, structure.graph.cooks)
        current = join
    }
    return timelines
}

private fun combine(
    prefix: List<Timeline>,
    arms: List<List<Timeline>>,
    mode: GateMode,
    cooks: Int,
): List<Timeline> {
    val merged = when (mode) {
        GateMode.Xor -> arms.flatten()
        GateMode.And -> cartesian(arms).map { par(it, cooks) }
        GateMode.None -> error("combine on a step that does not split")
    }
    return cap(prefix.flatMap { head -> merged.map { seq(head, it) } })
}

private fun cartesian(arms: List<List<Timeline>>): List<List<Timeline>> {
    var acc = listOf(emptyList<Timeline>())
    for (arm in arms) {
        if (acc.size.toLong() * arm.size > MAX_CONFIGURATIONS) {
            throw GraphFailure(listOf("recipe has more than $MAX_CONFIGURATIONS configurations"))
        }
        acc = acc.flatMap { prefix -> arm.map { prefix + it } }
    }
    return acc
}

private fun cap(timelines: List<Timeline>): List<Timeline> {
    if (timelines.size > MAX_CONFIGURATIONS) {
        throw GraphFailure(listOf("recipe has more than $MAX_CONFIGURATIONS configurations"))
    }
    return timelines
}

private fun nodeTimeline(node: InputNode, repeats: Int): Timeline {
    val spanTools = node.tools.filter { !it.optional && it.hold == ToolHold.Span }.map { it.toolId }.toSet()
    val activeTools = node.tools.filter { !it.optional && it.hold == ToolHold.Active }.map { it.toolId }.toSet()
    val slices = mutableListOf<Slice>()
    var clock = 0L
    var hands = 0L
    repeat(repeats) {
        for (span in node.spans.sortedBy { it.ord }) {
            if (span.seconds == 0) continue
            val start = clock
            clock += span.seconds
            val busy = span.kind == SpanKind.Active
            slices += Slice(
                start = start,
                end = clock,
                busy = busy,
                tools = if (busy) spanTools + activeTools else spanTools,
            )
            if (busy) hands += span.seconds
        }
    }
    return Timeline(
        ready = clock,
        hands = hands,
        slices = slices,
        ingredients = node.ingredients.filter { !it.optional }.map { it.ingredientId }.toSet(),
        tools = node.tools.filter { !it.optional }.map { it.toolId }.toSet(),
        nodes = setOf(node.key),
    )
}

private fun seq(head: Timeline, tail: Timeline) = Timeline(
    ready = head.ready + tail.ready,
    hands = head.hands + tail.hands,
    slices = head.slices + tail.slices.map { it.shift(head.ready) },
    ingredients = head.ingredients + tail.ingredients,
    tools = head.tools + tail.tools,
    nodes = head.nodes + tail.nodes,
)

private fun par(arms: List<Timeline>, cooks: Int): Timeline {
    val ordered = arms.sortedBy { it.nodes.minOrNull() ?: "" }
    val placed = mutableListOf<Slice>()
    var ready = 0L
    var hands = 0L
    val slices = mutableListOf<Slice>()
    for (arm in ordered) {
        val delay = minDelay(arm, placed, cooks)
        val shifted = arm.slices.map { it.shift(delay) }
        placed += shifted
        slices += shifted
        val end = delay + arm.ready
        if (end > ready) ready = end
        hands += arm.hands
    }
    return Timeline(
        ready = ready,
        hands = hands,
        slices = slices,
        ingredients = arms.flatMap { it.ingredients }.toSet(),
        tools = arms.flatMap { it.tools }.toSet(),
        nodes = arms.flatMap { it.nodes }.toSet(),
    )
}

private fun minDelay(arm: Timeline, placed: List<Slice>, cooks: Int): Long {
    if (arm.slices.isEmpty()) return 0
    val candidates = mutableSetOf(0L)
    for (slice in placed) {
        for (own in arm.slices) {
            val delay = slice.end - own.start
            if (delay > 0) candidates += delay
        }
    }
    for (delay in candidates.sorted()) {
        if (fits(arm, delay, placed, cooks)) return delay
    }
    throw GraphFailure(listOf("schedule could not place a step"))
}

private fun fits(arm: Timeline, delay: Long, placed: List<Slice>, cooks: Int): Boolean =
    arm.slices.all { raw ->
        val slice = raw.shift(delay)
        cookOk(slice, placed, cooks) && toolsOk(slice, placed)
    }

private fun cookOk(slice: Slice, placed: List<Slice>, cooks: Int): Boolean {
    if (!slice.busy) return true
    val events = mutableListOf<Pair<Long, Int>>()
    for (other in placed) {
        if (!other.busy) continue
        val start = maxOf(other.start, slice.start)
        val end = minOf(other.end, slice.end)
        if (start < end) {
            events += start to 1
            events += end to -1
        }
    }
    var current = 0
    for ((_, delta) in events.sortedWith(compareBy({ it.first }, { it.second }))) {
        current += delta
        if (current >= cooks) return false
    }
    return true
}

private fun toolsOk(slice: Slice, placed: List<Slice>): Boolean {
    if (slice.tools.isEmpty()) return true
    return placed.none { other ->
        other.tools.any { it in slice.tools } && other.start < slice.end && slice.start < other.end
    }
}

private fun facts(sets: List<Set<Long>>): Map<Long, Presence> {
    if (sets.isEmpty()) return emptyMap()
    val union = sets.flatten().toSet()
    val intersection = sets.reduce { left, right -> left intersect right }
    return union.associateWith { id ->
        if (id in intersection) Presence.AllPaths else Presence.SomePaths
    }
}

private fun Long.toSeconds(): Int {
    if (this > Int.MAX_VALUE) throw GraphFailure(listOf("time exceeds integer range"))
    return toInt()
}
