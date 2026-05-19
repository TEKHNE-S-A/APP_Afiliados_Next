-- DROP SCHEMA public;

-- -- Skipped CREATE SCHEMA public;

















-- DROP TYPE public.crdatid;

DROP TYPE IF EXISTS public.crdatid CASCADE;
CREATE TYPE public.crdatid AS (
	"last_value" int8,
	log_cnt int8,
	is_called bool);



























-- DROP TYPE public.totelconid;

DROP TYPE IF EXISTS public.totelconid CASCADE;
CREATE TYPE public.totelconid AS (
	"last_value" int8,
	log_cnt int8,
	is_called bool);



-- DROP SEQUENCE public.crdatid;

DROP SEQUENCE IF EXISTS public.crdatid CASCADE;
DROP SEQUENCE IF EXISTS public.crdatid CASCADE;
CREATE SEQUENCE public.crdatid
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;
-- DROP SEQUENCE public.totelconid;

DROP SEQUENCE IF EXISTS public.totelconid CASCADE;
DROP SEQUENCE IF EXISTS public.totelconid CASCADE;
CREATE SEQUENCE public.totelconid
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;-- public.adadhesi definition

-- Drop table

-- DROP TABLE public.adadhesi;

DROP TABLE IF EXISTS public.adadhesi CASCADE;
DROP TYPE IF EXISTS public.adadhesi CASCADE;
DROP TABLE IF EXISTS public.adadhesi CASCADE;
CREATE TABLE public.adadhesi (
	adadhcodig int2 NOT NULL,
	adadhdescr bpchar(40) NOT NULL,
	adadhdetal bpchar(200) NOT NULL,
	adadhfbaja date NOT NULL,
	adadhflimi date NOT NULL,
	adadhbaseu varchar(128) NOT NULL,
	adadhhost varchar(128) NOT NULL,
	adadhport int2 NOT NULL,
	adadhsecur int2 NOT NULL,
	CONSTRAINT adadhesi_pkey PRIMARY KEY (adadhcodig)
);


-- public.adadhusu definition

-- Drop table

-- DROP TABLE public.adadhusu;

DROP TABLE IF EXISTS public.adadhusu CASCADE;
DROP TYPE IF EXISTS public.adadhusu CASCADE;
DROP TABLE IF EXISTS public.adadhusu CASCADE;
CREATE TABLE public.adadhusu (
	adadhcodig int2 NOT NULL,
	nuusuid bpchar(40) NOT NULL,
	adadusuval bool NOT NULL,
	adadhfalta date NOT NULL,
	adadhfmodi date NOT NULL,
	CONSTRAINT adadhusu_pkey PRIMARY KEY (adadhcodig, nuusuid)
);
CREATE INDEX iadadhe2 ON public.adadhusu USING btree (nuusuid);


-- public.ausoaufo definition

-- Drop table

-- DROP TABLE public.ausoaufo;

DROP TABLE IF EXISTS public.ausoaufo CASCADE;
DROP TYPE IF EXISTS public.ausoaufo CASCADE;
DROP TABLE IF EXISTS public.ausoaufo CASCADE;
CREATE TABLE public.ausoaufo (
	ausolicid bpchar(36) NOT NULL,
	ausolfotid bpchar(36) NOT NULL,
	ausolf bytea NOT NULL,
	ausolf_gxi varchar(2048) NULL,
	CONSTRAINT ausoaufo_pkey PRIMARY KEY (ausolicid, ausolfotid)
);

-- public.ausolici definition

-- Drop table

-- DROP TABLE public.ausolici;

DROP TABLE IF EXISTS public.ausolici CASCADE;
DROP TYPE IF EXISTS public.ausolici CASCADE;
DROP TABLE IF EXISTS public.ausolici CASCADE;
CREATE TABLE public.ausolici (
	ausolicid bpchar(36) NOT NULL,
	nuusuid bpchar(40) NOT NULL,
	ausoldescr bpchar(40) NOT NULL,
	ausolfecal date NOT NULL,
	ausolfecor date NOT NULL,
	autippreid bpchar(30) NULL,
	ausolnroaf bpchar(20) NOT NULL,
	ausoltexto text NOT NULL,
	ausolentid bpchar(30) NOT NULL,
	ausolfecve date NOT NULL,
	ausolextid bpchar(30) NOT NULL,
	ausolrechd bpchar(1) NOT NULL,
	ausolestad bpchar(3) NOT NULL,
	ausolentno bpchar(50) NOT NULL,
	ausolautnu bpchar(40) NOT NULL,
	ausoltipo bpchar(1) NOT NULL,
	ausolpsoco bpchar(40) NOT NULL,
	ausolcantp int2 NOT NULL,
	ausolobspr bpchar(40) NOT NULL,
	ausolgravc int2 NOT NULL,
	CONSTRAINT ausolici_pkey PRIMARY KEY (ausolicid)
);
CREATE INDEX iausoli1 ON public.ausolici USING btree (autippreid);
CREATE INDEX uausoli1 ON public.ausolici USING btree (nuusuid, ausolfecal DESC, ausolfecor DESC, ausolicid);


-- public.autippre definition

-- Drop table

-- DROP TABLE public.autippre;

DROP TABLE IF EXISTS public.autippre CASCADE;
DROP TYPE IF EXISTS public.autippre CASCADE;
DROP TABLE IF EXISTS public.autippre CASCADE;
CREATE TABLE public.autippre (
	autippreid bpchar(30) NOT NULL,
	autipprede bpchar(40) NOT NULL,
	autipfecba date NOT NULL,
	CONSTRAINT autippre_pkey PRIMARY KEY (autippreid)
);


-- public.bipagosg definition

-- Drop table

-- DROP TABLE public.bipagosg;

DROP TABLE IF EXISTS public.bipagosg CASCADE;
DROP TYPE IF EXISTS public.bipagosg CASCADE;
DROP TABLE IF EXISTS public.bipagosg CASCADE;
CREATE TABLE public.bipagosg (
	bipagoid bpchar(36) NOT NULL,
	nuusuafili varchar(40) NOT NULL,
	bipaggenaf varchar(40) NOT NULL,
	bipaggenfe date NOT NULL,
	bipagoribi bpchar(36) NOT NULL,
	CONSTRAINT bipagosg_pkey PRIMARY KEY (bipagoid, nuusuafili, bipaggenaf)
);


-- public.bipagosp definition

-- Drop table

-- DROP TABLE public.bipagosp;

DROP TABLE IF EXISTS public.bipagosp CASCADE;
DROP TYPE IF EXISTS public.bipagosp CASCADE;
DROP TABLE IF EXISTS public.bipagosp CASCADE;
CREATE TABLE public.bipagosp (
	bipagoid bpchar(36) NOT NULL,
	nuusuafili varchar(40) NOT NULL,
	bipagodesc bpchar(40) NOT NULL,
	bipagoesta bpchar(3) NOT NULL,
	bipagofech date NOT NULL,
	bipagoimpo numeric(15, 2) NOT NULL,
	bipagobill bpchar(36) NOT NULL,
	bipagoidex varchar(40) NOT NULL,
	bipagotipo bpchar(3) NOT NULL,
	bipagorefe bpchar(40) NOT NULL,
	bipagoafil varchar(40) NOT NULL,
	bipagonroa bpchar(20) NULL,
	bipagoapen bpchar(60) NULL,
	CONSTRAINT bipagosp_pkey PRIMARY KEY (bipagoid, nuusuafili)
);


-- public.cacartil definition

-- Drop table

-- DROP TABLE public.cacartil;

DROP TABLE IF EXISTS public.cacartil CASCADE;
DROP TYPE IF EXISTS public.cacartil CASCADE;
DROP TABLE IF EXISTS public.cacartil CASCADE;
CREATE TABLE public.cacartil (
	cacarid bpchar(36) NOT NULL,
	nuplaid bpchar(30) NOT NULL,
	carubid bpchar(30) NOT NULL,
	caespid bpchar(30) NOT NULL,
	caentid bpchar(30) NOT NULL,
	CONSTRAINT cacartil_pkey PRIMARY KEY (cacarid)
);
CREATE INDEX icacart1 ON public.cacartil USING btree (caentid);
CREATE INDEX icacart2 ON public.cacartil USING btree (caespid, carubid);
CREATE INDEX ucacart1 ON public.cacartil USING btree (nuplaid, carubid, caespid, caentid);


-- public.caendire definition

-- Drop table

-- DROP TABLE public.caendire;

DROP TABLE IF EXISTS public.caendire CASCADE;
DROP TYPE IF EXISTS public.caendire CASCADE;
DROP TABLE IF EXISTS public.caendire CASCADE;
CREATE TABLE public.caendire (
	caentid bpchar(30) NOT NULL,
	caendid bpchar(30) NOT NULL,
	nulocid bpchar(30) NOT NULL,
	caendirecc varchar(1024) NOT NULL,
	caendirpri bpchar(1) NOT NULL,
	caendgeolo bpchar(50) NOT NULL,
	caendhorat varchar(100) NOT NULL,
	caendpenge bpchar(1) NOT NULL,
	CONSTRAINT caendire_pkey PRIMARY KEY (caentid, caendid)
);
CREATE INDEX icaendi1 ON public.caendire USING btree (nulocid);


-- public.caentele definition

-- Drop table

-- DROP TABLE public.caentele;

DROP TABLE IF EXISTS public.caentele CASCADE;
DROP TYPE IF EXISTS public.caentele CASCADE;
DROP TABLE IF EXISTS public.caentele CASCADE;
CREATE TABLE public.caentele (
	caentid bpchar(30) NOT NULL,
	caendid bpchar(30) NOT NULL,
	caenteleid bpchar(30) NOT NULL,
	caentelefo bpchar(20) NOT NULL,
	caentelepr bpchar(1) NOT NULL,
	CONSTRAINT caentele_pkey PRIMARY KEY (caentid, caendid, caenteleid)
);


-- public.caentida definition

-- Drop table

-- DROP TABLE public.caentida;

DROP TABLE IF EXISTS public.caentida CASCADE;
DROP TYPE IF EXISTS public.caentida CASCADE;
DROP TABLE IF EXISTS public.caentida CASCADE;
CREATE TABLE public.caentida (
	caentid bpchar(30) NOT NULL,
	caentapeno bpchar(50) NOT NULL,
	caentmail varchar(100) NOT NULL,
	caentweb varchar(1000) NOT NULL,
	caentmarca bool NOT NULL,
	caentprior int2 NOT NULL,
	CONSTRAINT caentida_pkey PRIMARY KEY (caentid)
);
CREATE INDEX ucaenti1 ON public.caentida USING btree (caentprior DESC, caentapeno, caentid);
CREATE INDEX ucaentid ON public.caentida USING btree (caentapeno);


-- public.caespeci definition

-- Drop table

-- DROP TABLE public.caespeci;

DROP TABLE IF EXISTS public.caespeci CASCADE;
DROP TYPE IF EXISTS public.caespeci CASCADE;
DROP TABLE IF EXISTS public.caespeci CASCADE;
CREATE TABLE public.caespeci (
	caespid bpchar(30) NOT NULL,
	carubid bpchar(30) NOT NULL,
	caespdescr bpchar(40) NOT NULL,
	CONSTRAINT caespeci_pkey PRIMARY KEY (caespid, carubid)
);
CREATE INDEX icaespe1 ON public.caespeci USING btree (carubid);


-- public.camicart definition

-- Drop table

-- DROP TABLE public.camicart;

DROP TABLE IF EXISTS public.camicart CASCADE;
DROP TYPE IF EXISTS public.camicart CASCADE;
DROP TABLE IF EXISTS public.camicart CASCADE;
CREATE TABLE public.camicart (
	nuusuid bpchar(40) NOT NULL,
	caentid bpchar(30) NOT NULL,
	camictipoc bpchar(1) NOT NULL,
	CONSTRAINT camicart_pkey PRIMARY KEY (nuusuid, caentid)
);
CREATE INDEX icamica1 ON public.camicart USING btree (caentid);


-- public.carubro definition

-- Drop table

-- DROP TABLE public.carubro;

DROP TABLE IF EXISTS public.carubro CASCADE;
DROP TYPE IF EXISTS public.carubro CASCADE;
DROP TABLE IF EXISTS public.carubro CASCADE;
CREATE TABLE public.carubro (
	carubid bpchar(30) NOT NULL,
	carubdescr bpchar(40) NOT NULL,
	carubtipor bpchar(3) NOT NULL,
	CONSTRAINT carubro_pkey PRIMARY KEY (carubid)
);


-- public.crcreden definition

-- Drop table

-- DROP TABLE public.crcreden;

DROP TABLE IF EXISTS public.crcreden CASCADE;
DROP TYPE IF EXISTS public.crcreden CASCADE;
DROP TABLE IF EXISTS public.crcreden CASCADE;
CREATE TABLE public.crcreden (
	crcreid bpchar(30) NOT NULL,
	crcrefecvi date NOT NULL,
	crcrelin text NOT NULL,
	crcrenroaf bpchar(20) NOT NULL,
	crcreapeno bpchar(62) NOT NULL,
	crcreafili varchar(40) NOT NULL,
	crcrecuil int8 NOT NULL,
	crcreplaid bpchar(30) NULL,
	crcrei bytea NULL,
	crcrei_gxi varchar(2048) NULL,
	crcredocum bpchar(20) NOT NULL,
	crcresexo bpchar(1) NOT NULL,
	crcrefecha date NOT NULL,
	crcrehash varchar(256) NOT NULL,
	crcreifech timestamp NOT NULL,
	CONSTRAINT crcreden_pkey PRIMARY KEY (crcreid)
);
CREATE INDEX icrcred3 ON public.crcreden USING btree (crcreplaid);
CREATE INDEX ucrcrede ON public.crcreden USING btree (crcreafili, crcreid);


-- public.crcredus definition

-- Drop table

-- DROP TABLE public.crcredus;

DROP TABLE IF EXISTS public.crcredus CASCADE;
DROP TYPE IF EXISTS public.crcredus CASCADE;
DROP TABLE IF EXISTS public.crcredus CASCADE;
CREATE TABLE public.crcredus (
	nuusuid bpchar(40) NOT NULL,
	crcreid bpchar(30) NOT NULL,
	crcrepropi bpchar(1) NOT NULL,
	CONSTRAINT crcredus_pkey PRIMARY KEY (nuusuid, crcreid)
);
CREATE INDEX icrcred1 ON public.crcredus USING btree (crcreid);
CREATE INDEX ucrcredu ON public.crcredus USING btree (nuusuid, crcrepropi DESC, crcreid);


-- public.crdatos definition

-- Drop table

-- DROP TABLE public.crdatos;

DROP TABLE IF EXISTS public.crdatos CASCADE;
DROP TYPE IF EXISTS public.crdatos CASCADE;
DROP TABLE IF EXISTS public.crdatos CASCADE;
CREATE TABLE public.crdatos (
	crdatid int4 DEFAULT nextval('crdatid'::regclass) NOT NULL,
	crdatdescr bpchar(40) NOT NULL,
	crdattipo bpchar(1) NOT NULL,
	crdatetiqu bpchar(80) NOT NULL,
	crdatnombr bpchar(40) NOT NULL,
	crdatetixp int2 NOT NULL,
	crdatetiyp int2 NOT NULL,
	crdatetico bpchar(20) NOT NULL,
	crdatetifu varchar(40) NOT NULL,
	crdateties bpchar(10) NULL,
	crdatetita int2 NOT NULL,
	crdatxpos int2 NOT NULL,
	crdatypos int2 NOT NULL,
	crdatcolor bpchar(20) NOT NULL,
	crdatfuent varchar(40) NOT NULL,
	crdatestil bpchar(10) NULL,
	crdattaman int2 NOT NULL,
	crdatyorde int2 NOT NULL,
	crdatxorde int2 NOT NULL,
	CONSTRAINT crdatos_pkey PRIMARY KEY (crdatid)
);
CREATE INDEX ucrdatos ON public.crdatos USING btree (crdatyorde, crdatxorde);


-- public.evevalua definition

-- Drop table

-- DROP TABLE public.evevalua;

DROP TABLE IF EXISTS public.evevalua CASCADE;
DROP TYPE IF EXISTS public.evevalua CASCADE;
DROP TABLE IF EXISTS public.evevalua CASCADE;
CREATE TABLE public.evevalua (
	evevalenti bpchar(30) NOT NULL,
	evevaldire bpchar(30) NOT NULL,
	nuusuid bpchar(40) NOT NULL,
	evevafecha date NOT NULL,
	evevapunta int2 NOT NULL,
	evevaobser text NOT NULL,
	CONSTRAINT evevalua_pkey PRIMARY KEY (evevalenti, evevaldire, nuusuid)
);
CREATE INDEX ieveval1 ON public.evevalua USING btree (nuusuid);


-- public.gxdeviceresult definition

-- Drop table

-- DROP TABLE public.gxdeviceresult;

DROP TABLE IF EXISTS public.gxdeviceresult CASCADE;
DROP TYPE IF EXISTS public.gxdeviceresult CASCADE;
DROP TABLE IF EXISTS public.gxdeviceresult CASCADE;
CREATE TABLE public.gxdeviceresult (
	gxapplicationid bpchar(127) DEFAULT ''::bpchar NOT NULL,
	gxqueryid bpchar(127) NOT NULL,
	gxresultset bpchar(127) NOT NULL,
	gxdeviceid bpchar(127) NOT NULL,
	gxsyncdate date NOT NULL,
	CONSTRAINT gxdeviceresult_pkey PRIMARY KEY (gxapplicationid, gxqueryid, gxresultset, gxdeviceid)
);


-- public.gxparameters definition

-- Drop table

-- DROP TABLE public.gxparameters;

DROP TABLE IF EXISTS public.gxparameters CASCADE;
DROP TYPE IF EXISTS public.gxparameters CASCADE;
DROP TABLE IF EXISTS public.gxparameters CASCADE;
CREATE TABLE public.gxparameters (
	gxparid bpchar(20) NOT NULL,
	gxparvalue bpchar(80) NULL,
	CONSTRAINT gxparameters_pkey PRIMARY KEY (gxparid)
);


-- public.gxresultrows definition

-- Drop table

-- DROP TABLE public.gxresultrows;

DROP TABLE IF EXISTS public.gxresultrows CASCADE;
DROP TYPE IF EXISTS public.gxresultrows CASCADE;
DROP TABLE IF EXISTS public.gxresultrows CASCADE;
CREATE TABLE public.gxresultrows (
	gxresultset bpchar(127) NOT NULL,
	gxrowpk varchar(255) NOT NULL,
	gxrowhash bpchar(127) NULL,
	CONSTRAINT gxresultrows_pkey PRIMARY KEY (gxresultset, gxrowpk)
);


-- public.hicuesti definition

-- Drop table

-- DROP TABLE public.hicuesti;

DROP TABLE IF EXISTS public.hicuesti CASCADE;
DROP TYPE IF EXISTS public.hicuesti CASCADE;
DROP TABLE IF EXISTS public.hicuesti CASCADE;
CREATE TABLE public.hicuesti (
	hicuestid bpchar(40) NOT NULL,
	hicuestdes varchar(128) NOT NULL,
	hicuestfde date NOT NULL,
	hicuestfha date NOT NULL,
	hicuesttip bpchar(3) NOT NULL,
	CONSTRAINT hicuesti_pkey PRIMARY KEY (hicuestid)
);


-- public.hievalua definition

-- Drop table

-- DROP TABLE public.hievalua;

DROP TABLE IF EXISTS public.hievalua CASCADE;
DROP TYPE IF EXISTS public.hievalua CASCADE;
DROP TABLE IF EXISTS public.hievalua CASCADE;
CREATE TABLE public.hievalua (
	nuusuid bpchar(40) NOT NULL,
	hiidatenci bpchar(40) NOT NULL,
	hicuestid bpchar(40) NOT NULL,
	hievalotor int2 NOT NULL,
	hievalfech date NOT NULL,
	CONSTRAINT hievalua_pkey PRIMARY KEY (nuusuid, hiidatenci, hicuestid)
);
CREATE INDEX ihieval1 ON public.hievalua USING btree (hicuestid);


-- public.hihistor definition

-- Drop table

-- DROP TABLE public.hihistor;

DROP TABLE IF EXISTS public.hihistor CASCADE;
DROP TYPE IF EXISTS public.hihistor CASCADE;
DROP TABLE IF EXISTS public.hihistor CASCADE;
CREATE TABLE public.hihistor (
	nuusuid bpchar(40) NOT NULL,
	hiidatenci bpchar(40) NOT NULL,
	hidesconoc bpchar(1) NOT NULL,
	hientinomb bpchar(40) NOT NULL,
	hifecha date NOT NULL,
	hicantidad int2 NOT NULL,
	hifechamod date NOT NULL,
	hientiid bpchar(40) NOT NULL,
	CONSTRAINT hihistor_pkey PRIMARY KEY (nuusuid, hiidatenci)
);


-- public.noinfuti definition

-- Drop table

-- DROP TABLE public.noinfuti;

DROP TABLE IF EXISTS public.noinfuti CASCADE;
DROP TYPE IF EXISTS public.noinfuti CASCADE;
DROP TABLE IF EXISTS public.noinfuti CASCADE;
CREATE TABLE public.noinfuti (
	noinfutili bpchar(36) NOT NULL,
	noinftipo bpchar(1) NOT NULL,
	noinfdescr bpchar(40) NOT NULL,
	noinftelef bpchar(20) NOT NULL,
	noinfldire varchar(1024) NOT NULL,
	noinfgeolo bpchar(50) NOT NULL,
	noinim bytea NOT NULL,
	noinim_gxi varchar(2048) NULL,
	noinflink varchar(1000) NULL,
	CONSTRAINT noinfuti_pkey PRIMARY KEY (noinfutili)
);


-- public.nonoveda definition

-- Drop table

-- DROP TABLE public.nonoveda;

DROP TABLE IF EXISTS public.nonoveda CASCADE;
DROP TYPE IF EXISTS public.nonoveda CASCADE;
DROP TABLE IF EXISTS public.nonoveda CASCADE;
CREATE TABLE public.nonoveda (
	nonovid bpchar(36) NOT NULL,
	nonovdescr varchar(200) NOT NULL,
	nonovfecha date NOT NULL,
	nonovtexto text NOT NULL,
	nonovfecvi date NOT NULL,
	nonofo bytea NOT NULL,
	nonofo_gxi varchar(2048) NULL,
	CONSTRAINT nonoveda_pkey PRIMARY KEY (nonovid)
);


-- public.nudispos definition

-- Drop table

-- DROP TABLE public.nudispos;

DROP TABLE IF EXISTS public.nudispos CASCADE;
DROP TYPE IF EXISTS public.nudispos CASCADE;
DROP TABLE IF EXISTS public.nudispos CASCADE;
CREATE TABLE public.nudispos (
	nudistipod int2 NOT NULL,
	nudisid bpchar(128) NOT NULL,
	nudistoken varchar(1000) NOT NULL,
	nudisdescr bpchar(128) NOT NULL,
	nudisosnam varchar(40) NOT NULL,
	nudisosver varchar(40) NOT NULL,
	nudislangu varchar(40) NOT NULL,
	nudisplatf varchar(128) NOT NULL,
	nudisavcod varchar(40) NOT NULL,
	nudisavnam varchar(40) NOT NULL,
	CONSTRAINT nudispos_pkey PRIMARY KEY (nudistipod, nudisid)
);


-- public.nulocali definition

-- Drop table

-- DROP TABLE public.nulocali;

DROP TABLE IF EXISTS public.nulocali CASCADE;
DROP TYPE IF EXISTS public.nulocali CASCADE;
DROP TABLE IF EXISTS public.nulocali CASCADE;
CREATE TABLE public.nulocali (
	nulocid bpchar(30) NOT NULL,
	nulocdescr bpchar(40) NOT NULL,
	nuproid bpchar(30) NOT NULL,
	CONSTRAINT nulocali_pkey PRIMARY KEY (nulocid)
);
CREATE INDEX inuloca1 ON public.nulocali USING btree (nuproid);


-- public.numedia definition

-- Drop table

-- DROP TABLE public.numedia;

DROP TABLE IF EXISTS public.numedia CASCADE;
DROP TYPE IF EXISTS public.numedia CASCADE;
DROP TABLE IF EXISTS public.numedia CASCADE;
CREATE TABLE public.numedia (
	numeid varchar(30) NOT NULL,
	numeparam bpchar(30) NOT NULL,
	numeimg bytea NOT NULL,
	numeimg_gx varchar(2048) NULL,
	CONSTRAINT numedia_pkey PRIMARY KEY (numeid)
);
CREATE UNIQUE INDEX inumedpa ON public.numedia USING btree (numeparam);


-- public.numessa1 definition

-- Drop table

-- DROP TABLE public.numessa1;

DROP TABLE IF EXISTS public.numessa1 CASCADE;
DROP TYPE IF EXISTS public.numessa1 CASCADE;
DROP TABLE IF EXISTS public.numessa1 CASCADE;
CREATE TABLE public.numessa1 (
	nuusuid bpchar(40) NOT NULL,
	numesid int8 NOT NULL,
	numeeid int2 NOT NULL,
	numeedescr varchar(512) NOT NULL,
	CONSTRAINT numessa1_pkey PRIMARY KEY (nuusuid, numesid, numeeid)
);


-- public.numessag definition

-- Drop table

-- DROP TABLE public.numessag;

DROP TABLE IF EXISTS public.numessag CASCADE;
DROP TYPE IF EXISTS public.numessag CASCADE;
DROP TABLE IF EXISTS public.numessag CASCADE;
CREATE TABLE public.numessag (
	nuusuid bpchar(40) NOT NULL,
	numesid int8 NOT NULL,
	numesmensa text NOT NULL,
	numesfecen date NOT NULL,
	numesfecre date NULL,
	numestitul varchar(80) NOT NULL,
	nudistipod int2 NULL,
	nudisid bpchar(128) NULL,
	numesenvia bpchar(1) NOT NULL,
	numesulter int2 NOT NULL,
	CONSTRAINT numessag_pkey PRIMARY KEY (nuusuid, numesid)
);
CREATE INDEX inumess3 ON public.numessag USING btree (nuusuid, nudistipod, nudisid);


-- public.numitem definition

-- Drop table

-- DROP TABLE public.numitem;

DROP TABLE IF EXISTS public.numitem CASCADE;
DROP TYPE IF EXISTS public.numitem CASCADE;
DROP TABLE IF EXISTS public.numitem CASCADE;
CREATE TABLE public.numitem (
	numitid varchar(256) NOT NULL,
	numitdescr bpchar(40) NOT NULL,
	numitorden int2 NOT NULL,
	numitesfun bool NOT NULL,
	numithabil bool NOT NULL,
	numitdesam varchar(200) NOT NULL,
	CONSTRAINT numitem_pkey PRIMARY KEY (numitid)
);
CREATE INDEX unumitem ON public.numitem USING btree (numitorden, numitid);


-- public.nupais definition

-- Drop table

-- DROP TABLE public.nupais;

DROP TABLE IF EXISTS public.nupais CASCADE;
DROP TYPE IF EXISTS public.nupais CASCADE;
DROP TABLE IF EXISTS public.nupais CASCADE;
CREATE TABLE public.nupais (
	nupaiid bpchar(30) NOT NULL,
	nupaidescr bpchar(40) NOT NULL,
	CONSTRAINT nupais_pkey PRIMARY KEY (nupaiid)
);


-- public.nupermis definition

-- Drop table

-- DROP TABLE public.nupermis;

DROP TABLE IF EXISTS public.nupermis CASCADE;
DROP TYPE IF EXISTS public.nupermis CASCADE;
DROP TABLE IF EXISTS public.nupermis CASCADE;
CREATE TABLE public.nupermis (
	nuperrolei int8 NOT NULL,
	numitid varchar(256) NOT NULL,
	CONSTRAINT nupermis_pkey PRIMARY KEY (nuperrolei, numitid)
);
CREATE INDEX inuperm1 ON public.nupermis USING btree (numitid);


-- public.nuplan definition

-- Drop table

-- DROP TABLE public.nuplan;

DROP TABLE IF EXISTS public.nuplan CASCADE;
DROP TYPE IF EXISTS public.nuplan CASCADE;
DROP TABLE IF EXISTS public.nuplan CASCADE;
CREATE TABLE public.nuplan (
	nuplaid bpchar(30) NOT NULL,
	nupladescr bpchar(40) NOT NULL,
	nuplim bytea NOT NULL,
	nuplim_gxi varchar(2048) NULL,
	nuplalad bpchar(1) NOT NULL,
	nuplimfech timestamp NOT NULL,
	CONSTRAINT nuplan_pkey PRIMARY KEY (nuplaid)
);


-- public.nuplcre definition

-- Drop table

-- DROP TABLE public.nuplcre;

DROP TABLE IF EXISTS public.nuplcre CASCADE;
DROP TYPE IF EXISTS public.nuplcre CASCADE;
DROP TABLE IF EXISTS public.nuplcre CASCADE;
CREATE TABLE public.nuplcre (
	nuplaid bpchar(30) NOT NULL,
	crdatid int4 NOT NULL,
	nuplcetiqu bpchar(80) NOT NULL,
	nuplcetixp int2 NOT NULL,
	nuplcetiyp int2 NOT NULL,
	nuplcetico varchar(40) NOT NULL,
	nuplcetifu varchar(40) NOT NULL,
	nuplceties bpchar(10) NOT NULL,
	nuplcetita int2 NOT NULL,
	nuplcxpos int2 NOT NULL,
	nuplcypos int2 NOT NULL,
	nuplccolor varchar(40) NOT NULL,
	nuplcfuent varchar(40) NOT NULL,
	nuplcestil bpchar(10) NOT NULL,
	nuplctaman int2 NOT NULL,
	nuplcyorde int2 NOT NULL,
	nuplcxorde int2 NOT NULL,
	CONSTRAINT nuplcre_pkey PRIMARY KEY (nuplaid, crdatid)
);
CREATE INDEX inuplcr1 ON public.nuplcre USING btree (crdatid);


-- public.nuproces definition

-- Drop table

-- DROP TABLE public.nuproces;

DROP TABLE IF EXISTS public.nuproces CASCADE;
DROP TYPE IF EXISTS public.nuproces CASCADE;
DROP TABLE IF EXISTS public.nuproces CASCADE;
CREATE TABLE public.nuproces (
	nuprcid bpchar(36) NOT NULL,
	nuprcdescr varchar(128) NOT NULL,
	nuprcinife timestamp NOT NULL,
	nuprcfinfe timestamp NOT NULL,
	nuprcarchi bytea NOT NULL,
	nuprcfilna varchar(512) NOT NULL,
	nuprcfilty varchar(20) NOT NULL,
	nuprctotre int4 NOT NULL,
	nuprcuacfe timestamp NOT NULL,
	nuprcregpr int4 NOT NULL,
	nuprcaltus varchar(100) NOT NULL,
	nuprcaltfe timestamp NOT NULL,
	nuprccanus varchar(100) NOT NULL,
	nuprccanfe timestamp NOT NULL,
	nuprcestad bpchar(3) NOT NULL,
	nuprccancm varchar(512) NOT NULL,
	CONSTRAINT nuproces_pkey PRIMARY KEY (nuprcid)
);
CREATE INDEX unuproce ON public.nuproces USING btree (nuprcdescr, nuprcaltfe DESC);


-- public.nuprovin definition

-- Drop table

-- DROP TABLE public.nuprovin;

DROP TABLE IF EXISTS public.nuprovin CASCADE;
DROP TYPE IF EXISTS public.nuprovin CASCADE;
DROP TABLE IF EXISTS public.nuprovin CASCADE;
CREATE TABLE public.nuprovin (
	nuproid bpchar(30) NOT NULL,
	nuprodescr bpchar(40) NOT NULL,
	nupaiid bpchar(30) NOT NULL,
	CONSTRAINT nuprovin_pkey PRIMARY KEY (nuproid)
);
CREATE INDEX inuprov1 ON public.nuprovin USING btree (nupaiid);


-- public.nusispar definition

-- Drop table

-- DROP TABLE public.nusispar;

DROP TABLE IF EXISTS public.nusispar CASCADE;
DROP TYPE IF EXISTS public.nusispar CASCADE;
DROP TABLE IF EXISTS public.nusispar CASCADE;
CREATE TABLE public.nusispar (
	nusisgrupa bpchar(30) NOT NULL,
	nusistippa bpchar(30) NOT NULL,
	nusisvalpa text NOT NULL,
	CONSTRAINT nusispar_pkey PRIMARY KEY (nusisgrupa, nusistippa)
);


-- public.nuusdisp definition

-- Drop table

-- DROP TABLE public.nuusdisp;

DROP TABLE IF EXISTS public.nuusdisp CASCADE;
DROP TYPE IF EXISTS public.nuusdisp CASCADE;
DROP TABLE IF EXISTS public.nuusdisp CASCADE;
CREATE TABLE public.nuusdisp (
	nuusuid bpchar(40) NOT NULL,
	nudistipod int2 NOT NULL,
	nudisid bpchar(128) NOT NULL,
	nuusdfecul date NOT NULL,
	CONSTRAINT nuusdisp_pkey PRIMARY KEY (nuusuid, nudistipod, nudisid)
);
CREATE INDEX inuusdi1 ON public.nuusdisp USING btree (nudistipod, nudisid);


-- public.nuusuari definition

-- Drop table

-- DROP TABLE public.nuusuari;

DROP TABLE IF EXISTS public.nuusuari CASCADE;
DROP TYPE IF EXISTS public.nuusuari CASCADE;
DROP TABLE IF EXISTS public.nuusuari CASCADE;
CREATE TABLE public.nuusuari (
	nuusuid bpchar(40) NOT NULL,
	nuusuafili varchar(40) NOT NULL,
	nuplaid bpchar(30) NULL,
	nuusufecha date NOT NULL,
	nuusunroaf bpchar(20) NOT NULL,
	nuususexo bpchar(1) NULL,
	nuusuapell bpchar(60) NOT NULL,
	nuusuestit bpchar(1) NULL,
	nuusutelef bpchar(20) NOT NULL,
	nuusumail varchar(100) NOT NULL,
	nuusubille bpchar(1) NOT NULL,
	nuusuidbil bpchar(40) NOT NULL,
	nuusumailf timestamp NOT NULL,
	nuusui_gxi varchar(2048) NULL,
	nuusui bytea NULL,
	nuusuacept bpchar(1) NULL,
	nuusuqrbil text NOT NULL,
	nuusuultno int8 NOT NULL,
	nuusubajaf timestamp NOT NULL,
	nuusunivel int2 NOT NULL,
	CONSTRAINT nuusuari_pkey PRIMARY KEY (nuusuid)
);
CREATE INDEX inuusua1 ON public.nuusuari USING btree (nuplaid);
CREATE INDEX unuusuar ON public.nuusuari USING btree (nuusuafili);


-- public.nuusutok definition

-- Drop table

-- DROP TABLE public.nuusutok;

DROP TABLE IF EXISTS public.nuusutok CASCADE;
DROP TYPE IF EXISTS public.nuusutok CASCADE;
DROP TABLE IF EXISTS public.nuusutok CASCADE;
CREATE TABLE public.nuusutok (
	nuusutkid varchar(40) NOT NULL,
	nuusutkafi varchar(40) NOT NULL,
	nuusutkmai varchar(100) NOT NULL,
	nuusutkvto date NOT NULL,
	CONSTRAINT nuusutok_pkey PRIMARY KEY (nuusutkid)
);


-- public.toteleco definition

-- Drop table

-- DROP TABLE public.toteleco;

DROP TABLE IF EXISTS public.toteleco CASCADE;
DROP TYPE IF EXISTS public.toteleco CASCADE;
DROP TABLE IF EXISTS public.toteleco CASCADE;
CREATE TABLE public.toteleco (
	totelconid int8 DEFAULT nextval('totelconid'::regclass) NOT NULL,
	totelconnr varchar(20) NOT NULL,
	totelconto bpchar(6) NOT NULL,
	totelconfe timestamp NOT NULL,
	CONSTRAINT toteleco_pkey PRIMARY KEY (totelconid)
);


-- public.tuentida definition

-- Drop table

-- DROP TABLE public.tuentida;

DROP TABLE IF EXISTS public.tuentida CASCADE;
DROP TYPE IF EXISTS public.tuentida CASCADE;
DROP TABLE IF EXISTS public.tuentida CASCADE;
CREATE TABLE public.tuentida (
	tuentid bpchar(30) NOT NULL,
	tuentnombr bpchar(100) NOT NULL,
	tuenturl varchar(1000) NOT NULL,
	tuentactiv bool NOT NULL,
	CONSTRAINT tuentida_pkey PRIMARY KEY (tuentid)
);


-- public.adadhesi foreign keys

-- public.adadhusu foreign keys

-- public.ausoaufo foreign keys

-- public.ausolici foreign keys

-- public.autippre foreign keys

-- public.bipagosg foreign keys

-- public.bipagosp foreign keys

-- public.cacartil foreign keys

-- public.caendire foreign keys

-- public.caentele foreign keys

-- public.caentida foreign keys

-- public.caespeci foreign keys

-- public.camicart foreign keys

-- public.carubro foreign keys

-- public.crcreden foreign keys

-- public.crcredus foreign keys

-- public.crdatos foreign keys

-- public.evevalua foreign keys

-- public.gxdeviceresult foreign keys

-- public.gxparameters foreign keys

-- public.gxresultrows foreign keys

-- public.hicuesti foreign keys

-- public.hievalua foreign keys

-- public.hihistor foreign keys

-- public.noinfuti foreign keys

-- public.nonoveda foreign keys

-- public.nudispos foreign keys

-- public.nulocali foreign keys

-- public.numedia foreign keys

-- public.numessa1 foreign keys

-- public.numessag foreign keys

-- public.numitem foreign keys

-- public.nupais foreign keys

-- public.nupermis foreign keys

-- public.nuplan foreign keys

-- public.nuplcre foreign keys

-- public.nuproces foreign keys

-- public.nuprovin foreign keys

-- public.nusispar foreign keys

-- public.nuusdisp foreign keys

-- public.nuusuari foreign keys

-- public.nuusutok foreign keys

-- public.toteleco foreign keys

-- public.tuentida foreign keys

