/* Fictional, tiny, valid native HDF5/HL/netCDF/GDAL consumer. No exploit input. */
#include <hdf5.h>
#include <hdf5_hl.h>
#include <netcdf.h>
#include <gdal.h>
#include <assert.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
int main(void) {
  unsigned major=0,minor=0,release=0;
  assert(H5get_libversion(&major,&minor,&release)>=0);
  assert(major==1&&minor==10&&release==8);
  hbool_t safe=0;assert(H5is_library_threadsafe(&safe)>=0&&safe);
  const char *file="/tmp/utilibre-hdf5-fixture.h5",*ncfile="/tmp/utilibre-netcdf-fixture.nc";
  hsize_t dims[2]={4,4},maximum[2]={H5S_UNLIMITED,4},chunk[2]={2,2};
  hid_t f=H5Fcreate(file,H5F_ACC_TRUNC,H5P_DEFAULT,H5P_DEFAULT);assert(f>=0);
  hid_t space=H5Screate_simple(2,dims,maximum),props=H5Pcreate(H5P_DATASET_CREATE);assert(space>=0&&props>=0);
  assert(H5Pset_chunk(props,2,chunk)>=0);assert(H5Pset_deflate(props,1)>=0);assert(H5Pset_fletcher32(props)>=0);
  hid_t d=H5Dcreate2(f,"matrix",H5T_STD_I32LE,space,H5P_DEFAULT,props,H5P_DEFAULT);assert(d>=0);
  int values[16],out[16];for(int i=0;i<16;i++)values[i]=i+7;
  assert(H5Dwrite(d,H5T_NATIVE_INT,H5S_ALL,H5S_ALL,H5P_DEFAULT,values)>=0);
  assert(H5Dread(d,H5T_NATIVE_INT,H5S_ALL,H5S_ALL,H5P_DEFAULT,out)>=0);assert(!memcmp(values,out,sizeof values));
  assert(H5LTset_attribute_string(f,"matrix","provenance","fictional Utilibre fixture")>=0);
  assert(H5Pclose(props)>=0);assert(H5Sclose(space)>=0);assert(H5Dclose(d)>=0);assert(H5Fclose(f)>=0);
  f=H5Fopen(file,H5F_ACC_RDONLY,H5P_DEFAULT);assert(f>=0);
  assert(H5LTread_dataset_int(f,"matrix",out)>=0);assert(!memcmp(values,out,sizeof values));assert(H5Fclose(f)>=0);
  GDALAllRegister();GDALDatasetH gd=GDALOpen("HDF5:\"/tmp/utilibre-hdf5-fixture.h5\"://matrix",GA_ReadOnly);assert(gd);
  assert(GDALGetRasterXSize(gd)==4&&GDALGetRasterYSize(gd)==4);
  assert(GDALRasterIO(GDALGetRasterBand(gd,1),GF_Read,0,0,4,4,out,4,4,GDT_Int32,0,0)==CE_None);assert(!memcmp(values,out,sizeof values));GDALClose(gd);
  int nc,nd[2],variable;assert(nc_create(ncfile,NC_NETCDF4|NC_CLOBBER,&nc)==NC_NOERR);
  assert(nc_def_dim(nc,"y",4,&nd[0])==NC_NOERR);assert(nc_def_dim(nc,"x",4,&nd[1])==NC_NOERR);
  assert(nc_def_var(nc,"matrix",NC_INT,2,nd,&variable)==NC_NOERR);assert(nc_def_var_deflate(nc,variable,0,1,1)==NC_NOERR);
  assert(nc_enddef(nc)==NC_NOERR);assert(nc_put_var_int(nc,variable,values)==NC_NOERR);assert(nc_close(nc)==NC_NOERR);
  assert(nc_open(ncfile,NC_NOWRITE,&nc)==NC_NOERR);assert(nc_inq_varid(nc,"matrix",&variable)==NC_NOERR);
  assert(nc_get_var_int(nc,variable,out)==NC_NOERR);assert(!memcmp(values,out,sizeof values));assert(nc_close(nc)==NC_NOERR);
  gd=GDALOpen("NETCDF:\"/tmp/utilibre-netcdf-fixture.nc\":matrix",GA_ReadOnly);assert(gd);assert(GDALGetRasterXSize(gd)==4&&GDALGetRasterYSize(gd)==4);GDALClose(gd);
  /* Extend a legacy version-1 chunk B-tree dataset through supported APIs. */
  f=H5Fopen(file,H5F_ACC_RDWR,H5P_DEFAULT);assert(f>=0);d=H5Dopen2(f,"matrix",H5P_DEFAULT);assert(d>=0);
  hsize_t extended[2]={6,4};assert(H5Dset_extent(d,extended)>=0);space=H5Dget_space(d);assert(space>=0);
  hsize_t offset[2]={4,0},count[2]={2,4};assert(H5Sselect_hyperslab(space,H5S_SELECT_SET,offset,NULL,count,NULL)>=0);
  hid_t mem=H5Screate_simple(2,count,NULL);assert(mem>=0);assert(H5Dwrite(d,H5T_NATIVE_INT,mem,space,H5P_DEFAULT,values)>=0);
  assert(H5Dread(d,H5T_NATIVE_INT,mem,space,H5P_DEFAULT,out)>=0);assert(!memcmp(values,out,8*sizeof(int)));
  assert(H5Sclose(mem)>=0);assert(H5Sclose(space)>=0);assert(H5Dclose(d)>=0);assert(H5Fclose(f)>=0);
  assert(unlink(file)==0);assert(unlink(ncfile)==0);GDALDestroyDriverManager();H5close();
  puts("HDF5_OLD_HEADER_CHUNK_DEFLATE_HL_EXTEND_NETCDF_GDAL_PASSED");return 0;
}
