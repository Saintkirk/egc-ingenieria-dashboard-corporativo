CREATE TABLE `siteFiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`tipo` varchar(16) NOT NULL,
	`nombre` varchar(180) NOT NULL,
	`url` varchar(500) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`registradoPor` varchar(100) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siteFiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `siteHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`siteId` int NOT NULL,
	`estadoAnterior` varchar(24),
	`estadoNuevo` varchar(24) NOT NULL,
	`accion` varchar(40) NOT NULL,
	`rol` varchar(20) NOT NULL,
	`actor` varchar(100) NOT NULL,
	`comentario` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `siteHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`codigoSubtel` varchar(10) NOT NULL,
	`nombre` varchar(100) NOT NULL,
	`cliente` varchar(80) NOT NULL,
	`tipo` varchar(60) NOT NULL,
	`comuna` varchar(80) NOT NULL,
	`plazo` varchar(10) NOT NULL,
	`estado` varchar(24) NOT NULL DEFAULT 'recibido',
	`equipo` varchar(60) NOT NULL,
	`responsable` varchar(100) NOT NULL,
	`dibujante` varchar(100),
	`revisionResultado` varchar(16),
	`observacion` text,
	`version` int NOT NULL DEFAULT 1,
	`atraso` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sites_id` PRIMARY KEY(`id`),
	CONSTRAINT `sites_codigoSubtel_unique` UNIQUE(`codigoSubtel`)
);
