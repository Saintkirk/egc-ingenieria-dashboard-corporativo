ALTER TABLE `sites` ADD `latitud` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `longitud` double DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `elevacion` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sites` ADD `visitaProgramada` varchar(10);