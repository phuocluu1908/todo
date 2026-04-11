declare module 'kafkajs' {
	export class Kafka {
		constructor(opts?: any);
		producer(): any;
		consumer(opts?: any): any;
	}
	export type Producer = any;
	export type Consumer = any;
}
