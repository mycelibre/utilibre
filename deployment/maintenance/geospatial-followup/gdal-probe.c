/* Small synthetic/native driver regression gate, not an application. */
#include <assert.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <gdal.h>
#include <gdal_utils.h>
#include <ogr_api.h>
#include <cpl_conv.h>
#include <netcdf.h>

static const char *root;
static char *path(const char *name) {
    const size_t n = strlen(root) + strlen(name) + 2;
    char *p = malloc(n); assert(p); snprintf(p, n, "%s/%s", root, name); return p;
}
static void check(const int code) { if (code != NC_NOERR) { fprintf(stderr, "%s\n", nc_strerror(code)); abort(); } }
static void vector_check(const char *file) {
    GDALDatasetH ds = GDALOpenEx(file, GDAL_OF_VECTOR | GDAL_OF_READONLY, NULL, NULL, NULL);
    assert(ds); assert(GDALDatasetGetLayerCount(ds) == 1);
    OGRLayerH layer = GDALDatasetGetLayer(ds, 0); assert(layer);
    assert(OGR_L_GetFeatureCount(layer, 1) == 1);
    OGRFeatureH row = OGR_L_GetNextFeature(layer); assert(row);
    assert(strcmp(OGR_F_GetFieldAsString(row, OGR_F_GetFieldIndex(row, "label")), "Fictional workshop") == 0);
    assert(OGR_F_GetFieldAsInteger(row, OGR_F_GetFieldIndex(row, "attendees")) == 12);
    OGRGeometryH point = OGR_F_GetGeometryRef(row); assert(point);
    assert(fabs(OGR_G_GetX(point, 0) + 90.5) < 1e-6);
    assert(fabs(OGR_G_GetY(point, 0) - 14.6) < 1e-6);
    OGR_F_Destroy(row); GDALClose(ds);
}
static void make_nc(const char *input, const char *output) {
    GDALDatasetH src = GDALOpenEx(input, GDAL_OF_VECTOR | GDAL_OF_READONLY, NULL, NULL, NULL); assert(src);
    char *args[] = {"-f", "netCDF", NULL};
    GDALVectorTranslateOptions *opts = GDALVectorTranslateOptionsNew(args, NULL); assert(opts);
    int usage = 0; GDALDatasetH dst = GDALVectorTranslate(output, NULL, 1, &src, opts, &usage);
    assert(dst && !usage); GDALClose(dst); GDALClose(src); GDALVectorTranslateOptionsFree(opts);
}
static void mutate(const char *file, const char *attribute) {
    int nc, count, changed = 0; check(nc_open(file, NC_WRITE, &nc)); check(nc_redef(nc)); check(nc_inq_nvars(nc, &count));
    char text[4096]; memset(text, 'X', sizeof(text));
    for (int i = 0; i < count; ++i) {
        size_t len; if (nc_inq_attlen(nc, i, "geometry", &len) == NC_NOERR) {
            check(nc_put_att_text(nc, i, attribute, sizeof(text), text)); ++changed;
        }
    }
    assert(changed > 0); check(nc_enddef(nc)); check(nc_close(nc));
}
static void read_malformed(const char *name) {
    char *file = path(name);
    GDALDatasetH ds = GDALOpenEx(file, GDAL_OF_VECTOR | GDAL_OF_RASTER | GDAL_OF_READONLY, NULL, NULL, NULL);
    if (ds) { (void)GDALDatasetGetLayerCount(ds); GDALClose(ds); }
    free(file);
}
int main(int argc, char **argv) {
    assert(argc == 3); root = argv[2]; GDALAllRegister();
    assert(GDALGetDriverByName("netCDF")); assert(GDALGetDriverByName("HDF4")); assert(GDALGetDriverByName("GeoJSON")); assert(GDALGetDriverByName("GTiff"));
    if (!strcmp(argv[1], "--drivers")) {
        for (int i = 0; i < GDALGetDriverCount(); ++i) puts(GDALGetDriverShortName(GDALGetDriver(i)));
    } else if (!strcmp(argv[1], "--create")) {
        char *source = path("fictional.geojson");
        const char *names[] = {"valid.nc", "oversized-geometry.nc", "oversized-layer-name.nc"};
        for (int i = 0; i < 3; ++i) { char *file = path(names[i]); make_nc(source, file); vector_check(file); free(file); }
        char *geometry = path(names[1]), *layer = path(names[2]);
        mutate(geometry, "geometry"); mutate(layer, "ogr_layer_name");
        free(geometry); free(layer); free(source);
        puts("Created fictional valid and deliberately malformed netCDF fixtures");
    } else if (!strcmp(argv[1], "--valid")) {
        char *source = path("fictional.geojson"), *nc = path("valid.nc"); vector_check(source); vector_check(nc); free(source); free(nc);
        GDALDatasetH ds = GDALCreate(GDALGetDriverByName("GTiff"), "/tmp/fictional.tif", 2, 2, 1, GDT_Byte, NULL); assert(ds);
        unsigned char pixels[] = {0, 50, 100, 200}, reopened[4] = {0};
        assert(GDALRasterIO(GDALGetRasterBand(ds, 1), GF_Write, 0, 0, 2, 2, pixels, 2, 2, GDT_Byte, 0, 0) == CE_None); GDALClose(ds);
        ds = GDALOpen("/tmp/fictional.tif", GA_ReadOnly); assert(ds);
        assert(GDALRasterIO(GDALGetRasterBand(ds, 1), GF_Read, 0, 0, 2, 2, reopened, 2, 2, GDT_Byte, 0, 0) == CE_None); assert(memcmp(pixels, reopened, 4) == 0); GDALClose(ds);
        puts("Native GeoJSON/netCDF fields/coordinates and GeoTIFF write-reopen passed");
    } else if (!strcmp(argv[1], "--netcdf-malformed")) {
        read_malformed("oversized-geometry.nc"); read_malformed("oversized-layer-name.nc");
        puts("Native netCDF oversized geometry/layer-name attributes handled without process failure");
    } else if (!strcmp(argv[1], "--hdf-malformed") || !strcmp(argv[1], "--hdf-swath-malformed") || !strcmp(argv[1], "--hdf-grid-malformed")) {
        const char *names[] = {"issue_14356.he4", "issue_14363.he4"};
        const int start = !strcmp(argv[1], "--hdf-grid-malformed") ? 1 : 0;
        const int end = !strcmp(argv[1], "--hdf-swath-malformed") ? 1 : 2;
        for (int i = start; i < end; ++i) {
            read_malformed(names[i]); char *file = path(names[i]);
            GDALDatasetH ds = GDALOpenEx(file, GDAL_OF_MULTIDIM_RASTER, NULL, NULL, NULL);
            if (ds) { char *info = GDALMultiDimInfo(ds, NULL); CPLFree(info); GDALClose(ds); } free(file);
        }
        printf("Selected exact upstream HDF4 malformed fixture(s) passed classic and multidimensional entry points: %d\n", end - start);
    } else abort();
    GDALDestroyDriverManager(); return 0;
}
