const patientRoutes = require('./routes/patientRoutes');
console.log('patientRoutes:', typeof patientRoutes, Object.keys(patientRoutes));
if (patientRoutes && patientRoutes.stack) {
	console.log('stack length', patientRoutes.stack.length);
	patientRoutes.stack.forEach((l, i) => {
		const route = l.route ? l.route.path : (l.name || 'layer');
		const methods = l.route ? Object.keys(l.route.methods) : [];
		console.log(i, route, methods);
	});
}
else if (patientRoutes && patientRoutes.route) console.log('has route');
else console.log('No stack info');
