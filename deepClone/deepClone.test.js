const deepClone = require('./deepClone');

function isRegExEqual(r1, r2) {
	return (r1.source === r2.source) && (r1.global === r2.global) &&
		(r1.ignoreCase === r2.ignoreCase) && (r1.multiline === r2.multiline);
}

describe("Cloning basic types", () => {

	test('clone string', () => {
		expect(deepClone("string")).toBe("string");
	});
	test('clone number', () => {
		expect(deepClone(-123)).toBe(-123);
		expect(deepClone(123)).toBe(123);
		expect(deepClone(-123.456789)).toBeCloseTo(-123.456789);
		expect(deepClone(123.456789)).toBeCloseTo(123.456789);
		expect(deepClone(0)).toBe(0);
	});
	test('clone boolean', () => {
		expect(deepClone(false)).toBe(false);
		expect(deepClone(true)).toBe(true);
	});
	test('clone date', () => {
		const d = new Date("1982-02-01T11:29:33Z")
		const clonedD = deepClone(d);
		expect(clonedD.toISOString()).toBe(d.toISOString());
	});
	test('clone regEx', () => {
		const regEx = /.*/;
		const clonedRegEx = deepClone(regEx);
		const equal = isRegExEqual(regEx, clonedRegEx);
		expect(equal).toBe(true);
	});
	test('clone nan', () => {
		expect(deepClone(NaN)).toBe(NaN);
	});
	test('clone nul', () => {
		expect(deepClone(null)).toBeNull();
	});
	test('clone undefined', () => {
		expect(deepClone(undefined)).toBeUndefined();
	});
	test('clone Inf', () => {
		expect(deepClone(Infinity)).toBe(Infinity);
	});
	test('clone empty object', () => {
		const input = {};
		const output = deepClone(input);
		const equal = output.constructor === Object && Object.keys(output).length === 0;
		expect(equal).toBe(true);
	});
	test('clone empty array', () => {
		const input = [];
		const output = deepClone(input);
		const equal = Array.isArray(output) && output.length === 0;
		expect(equal).toBe(true);
	});
});

describe("Cloning arrays", () => { 
	test("number array", () => { 
		const input = [1, 2, 3, 4, -1, -2, -3, -4, 0];
		const output = deepClone(input);
		expect(Array.isArray(output)).toBe(true);
		for (let i = 0; i < input.length; ++i)
			expect(output[i]).toBe(input[i]);
	})
	test("mixed type array", () => {
		const input = [1, 2, 3, 4, "hello1", "world2"];
		const output = deepClone(input);
		expect(Array.isArray(output)).toBe(true);		
		for (let i = 0; i < input.length; ++i)
			expect(output[i]).toBe(input[i]);
	})
	test("array with objects", () => {
		const input = [10, { key11: "val11", key12: "val12" }, { key21: "val21", key22: { key221: "val221", key222: "val222" } }];
		const output = deepClone(input);
		expect(Array.isArray(output)).toBe(true);
		expect(output[0]).toBe(input[0]);
		expect(output[1].key11).toBe(input[1].key11);
		expect(output[1].key12).toBe(input[1].key12);
		expect(output[2].key21).toBe(input[2].key21);
		expect(output[2].key22.key221).toBe(input[2].key22.key221);
		expect(output[2].key22.key222).toBe(input[2].key22.key222);
	})
});

describe("Cloning objects", () => {
	test("Object with basic types", () => {
		const input = {
			string: 'string',
			number: 123,
			bool: false,
			date: new Date(),
			regEx: /.*/,
			nan: NaN,
			nul: null,
			undef: undefined,
			inf: Infinity,
		};
		const output = deepClone(input);
		const equal = input.string === output.string &&
			input.number === output.number &&
			input.bool === output.bool &&
			input.date.toISOString() === output.date.toISOString() &&
			isRegExEqual(input.regEx, output.regEx);
		expect(Object.keys(output).length).toBe(Object.keys(input).length);
		expect(equal).toBe(true);
		expect(output.nan).toBe(NaN);
		expect(output.nul).toBeNull();
		expect(output.undef).toBeUndefined();
		expect(output.inf).toBe(Infinity);
	});
	test("Object with nested child", () => {
		const input = { name: "Paddy", address: { town: "Lerum", country: "Sweden" } };
		const output = deepClone(input);
		expect(Object.keys(output).length).toBe(Object.keys(input).length);
		expect(Object.keys(output.address).length).toBe(Object.keys(input.address).length);
		expect(output.name).toBe(input.name);
		expect(output.address.town).toBe(input.address.town);
		expect(output.address.country).toBe(input.address.country);
	})
	test("Object with nested children array", () => {
		const input = {
			name: "Paddy", dob: new Date("1961-11-02T03:24:00Z"), children: [
				{ name: "child1", dob: new Date("1982-02-01T11:29:33Z"), address: { town: "Town1", country: "Country1" } },
				{ name: "child2", dob: new Date("1984-08-08T04:59:59Z"), address: { town: "Town2", country: "Country2" } },
				{
					name: "child3", dob: new Date("1987-06-06T00:00:00Z"), address: { town: "Town3", country: "Country4" }, children: [
						{ name: "gchild1", dob: new Date("2016-02-01"), address: { town: "Town11", country: "Country1" } },
						{ name: "gchild2", dob: new Date("2019-02-01"), address: { town: "Town22", country: "Country2" } },
					]
				}
			]
		};
		const output = deepClone(input);
		expect(Object.keys(output).length).toBe(Object.keys(input).length);
		expect(Array.isArray(output.children)).toBe(true);
		expect(output.children.length).toBe(input.children.length);
		expect(Array.isArray(output.children[2].children)).toBe(true);
		expect(output.children[2].children.length).toBe(input.children[2].children.length);
		expect(output.children[2].children[0].name).toBe(output.children[2].children[0].name);
		expect(output.children[2].children[1].name).toBe(output.children[2].children[1].name);
		expect(output.children[2].children[0].dob.toISOString()).toBe(output.children[2].children[0].dob.toISOString());
		expect(output.children[2].children[1].dob.toISOString()).toBe(output.children[2].children[1].dob.toISOString());
		expect(output.children[2].children[0].address.town).toBe(output.children[2].children[0].address.town);
		expect(output.children[2].children[1].address.town).toBe(output.children[2].children[1].address.town);
		expect(output.children[2].children[0].address.country).toBe(output.children[2].children[0].address.country);
		expect(output.children[2].children[1].address.country).toBe(output.children[2].children[1].address.country);
		expect(output.children[2].children[0].address.town).toBe(output.children[2].children[0].address.town);
		expect(Object.keys(output.children[2].children[0].address).length).toBe(Object.keys(output.children[2].children[0].address).length);		
		expect(Object.keys(output.children[2].children[1].address).length).toBe(Object.keys(output.children[2].children[1].address).length); /* ensure no extra keys were copied */
	})
});