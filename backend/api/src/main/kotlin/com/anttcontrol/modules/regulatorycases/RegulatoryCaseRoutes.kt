package com.anttcontrol.modules.regulatorycases

import io.ktor.server.response.respond
import io.ktor.server.request.header
import io.ktor.server.routing.Route
import io.ktor.server.routing.get
import io.ktor.server.routing.route

class RegulatoryCaseRoutes {
    private val service = RegulatoryCaseService()

    fun register(route: Route) {
        route.get("/dashboard") { call.respond(service.dashboard(call.organizationId())) }
        route.route("/cases") {
            get { call.respond(service.list(call.organizationId())) }
            get("/{id}") {
                val id = call.parameters["id"].orEmpty()
                call.respond(service.find(call.organizationId(), id))
            }
            get("/{id}/timeline") {
                val id = call.parameters["id"].orEmpty()
                call.respond(service.timeline(call.organizationId(), id))
            }
            get("/{id}/documents") {
                val id = call.parameters["id"].orEmpty()
                call.respond(service.documents(call.organizationId(), id))
            }
            get("/{id}/deadlines") {
                val id = call.parameters["id"].orEmpty()
                call.respond(service.deadlines(call.organizationId(), id))
            }
            get("/{id}/actions") {
                val id = call.parameters["id"].orEmpty()
                call.respond(service.actions(call.organizationId(), id))
            }
        }
        route.get("/legislation") { call.respond(service.legislation()) }
        route.get("/radar") { call.respond(service.radar()) }
        route.get("/notifications") { call.respond(service.notifications(call.organizationId())) }
        route.get("/audit") { call.respond(service.audit(call.organizationId())) }
    }

    private fun io.ktor.server.application.ApplicationCall.organizationId(): String =
        request.header("X-Organization-Id") ?: System.getenv("DEMO_ORGANIZATION_ID") ?: "org-demo"
}
