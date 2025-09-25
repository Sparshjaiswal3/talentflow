import { http, HttpResponse, delay } from "msw";
import { db } from "../db/dexie";
import { seedIfEmpty } from "../db/seed";


// Helpers
const sleep = (min = 200, max = 1200) => delay(Math.floor(Math.random() * (max - min)) + min);
const maybeFail = (rate = 0.08) => Math.random() < rate;


async function ensureSeed() { await seedIfEmpty(); }


function paginate(list, page = 1, pageSize = 10) {
    const total = list.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { items: list.slice(start, end), total, page, pageSize };
}


export const handlers = [
    // Jobs: GET /jobs?search=&status=&page=&pageSize=&sort=
    http.get("/jobs", async ({ request }) => {
        await ensureSeed();
        const url = new URL(request.url);
        const search = url.searchParams.get("search")?.toLowerCase() || "";
        const status = url.searchParams.get("status") || ""; // active|archived
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 10);
        const sort = url.searchParams.get("sort") || "order"; // order|title|-title


        let list = await db.jobs.toArray();
        if (search) list = list.filter(j => j.title.toLowerCase().includes(search) || j.slug.includes(search));
        if (status) list = list.filter(j => j.status === status);


        if (sort) {
            const dir = sort.startsWith("-") ? -1 : 1; const key = sort.replace(/^-/, "");
            list.sort((a, b) => (a[key] > b[key] ? 1 : -1) * dir);
        }


        await sleep();
        return HttpResponse.json(paginate(list, page, pageSize));
    }),


    // POST /jobs
    http.post("/jobs", async ({ request }) => {
        await ensureSeed();
        const body = await request.json();
        if (!body.title) return HttpResponse.json({ message: "Title required" }, { status: 400 });
        const slug = (body.slug || body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/(^-|-$)/g, "");
        const existing = await db.jobs.where({ slug }).first();
        if (existing) return HttpResponse.json({ message: "Slug must be unique" }, { status: 409 });


        const order = await db.jobs.count();
        const job = { id: crypto.randomUUID(), title: body.title, slug, status: "active", tags: body.tags || [], order, createdAt: Date.now(), updatedAt: Date.now() };


        if (maybeFail()) { await sleep(); return HttpResponse.json({ message: "Random write error" }, { status: 500 }); }


        await db.jobs.add(job);
        await sleep();
        return HttpResponse.json(job, { status: 201 });
    }),


    // PATCH /jobs/:id
    http.patch("/jobs/:id/reorder", async ({ params, request }) => {
        await ensureSeed();
        const { fromOrder, toOrder } = await request.json();
        if (maybeFail(0.1)) { await sleep(); return HttpResponse.json({ message: "Reorder failed (simulated)" }, { status: 500 }); }


        const all = await db.jobs.orderBy("order").toArray();
        const moved = all.find(j => j.order === fromOrder);
        if (!moved) return HttpResponse.json({ message: "Not found" }, { status: 404 });


        // Recompute orders
        const without = all.filter(j => j.id !== moved.id);
        without.splice(toOrder, 0, moved);
        await db.transaction("rw", db.jobs, async () => {
            for (let i = 0; i < without.length; i++) {
                await db.jobs.update(without[i].id, { order: i, updatedAt: Date.now() });
            }
        });
        await sleep();
        return HttpResponse.json({ success: true });
    }),
    http.get("/candidates", async ({ request }) => {
        await ensureSeed();
        const url = new URL(request.url);
        const search = url.searchParams.get("search")?.toLowerCase() || "";
        const stage = url.searchParams.get("stage") || "";
        const page = Number(url.searchParams.get("page") || 1);
        const pageSize = Number(url.searchParams.get("pageSize") || 50);


        let list = await db.candidates.toArray();
        if (search) list = list.filter(c => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search));
        if (stage) list = list.filter(c => c.stage === stage);


        await sleep(150, 800);
        return HttpResponse.json(paginate(list, page, pageSize));
    }),
    http.post("/candidates", async ({ request }) => {
        await ensureSeed();
        const body = await request.json();
        if (!body.name || !body.email) return HttpResponse.json({ message: "Name & email required" }, { status: 400 });
        const cand = { id: crypto.randomUUID(), ...body };
        if (maybeFail()) { await sleep(); return HttpResponse.json({ message: "Random write error" }, { status: 500 }); }
        await db.candidates.add(cand);
        await sleep();
        return HttpResponse.json(cand, { status: 201 });
    }),


    // PATCH /candidates/:id (stage transitions)
    http.patch("/candidates/:id", async ({ params, request }) => {
        await ensureSeed();
        const id = params.id; const patch = await request.json();
        if (maybeFail()) { await sleep(); return HttpResponse.json({ message: "Random write error" }, { status: 500 }); }
        await db.candidates.update(id, patch);
        await db.timelines.add({ candidateId: id, at: Date.now(), type: "stage", payload: { stage: patch.stage } });
        await sleep();
        const updated = await db.candidates.get(id);
        return HttpResponse.json(updated);
    }),
    http.get("/candidates/:id/timeline", async ({ params }) => {
        await ensureSeed();
        const items = await db.timelines.where({ candidateId: params.id }).reverse().sortBy("at");
        await sleep(100, 400);
        return HttpResponse.json(items);
    }),


    // Assessments
    http.get("/assessments/:jobId", async ({ params }) => {
        await ensureSeed();
        const a = await db.assessments.get({ jobId: params.jobId });
        await sleep(100, 400);
        return HttpResponse.json(a || { jobId: params.jobId, schema: { title: "New Assessment", sections: [] } });
    }),


    http.put("/assessments/:jobId", async ({ params, request }) => {
        await ensureSeed();
        const data = await request.json();
        if (maybeFail()) { await sleep(); return HttpResponse.json({ message: "Random write error" }, { status: 500 }); }
        await db.assessments.put({ jobId: params.jobId, schema: data.schema });
        await sleep();
        return HttpResponse.json({ ok: true });
    }),
    http.post("/assessments/:jobId/submit", async ({ params, request }) => {
        await ensureSeed();
        const res = await request.json();
        const rec = { jobId: params.jobId, candidateId: res.candidateId, submittedAt: Date.now(), answers: res.answers };
        if (maybeFail()) { await sleep(); return HttpResponse.json({ message: "Random write error" }, { status: 500 }); }
        await db.responses.add(rec);
        await sleep();
        return HttpResponse.json({ ok: true });
    }),
];